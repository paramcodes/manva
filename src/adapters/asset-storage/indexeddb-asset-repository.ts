import type { IDBPDatabase } from 'idb';
import { getSharedDatabase } from '@/adapters/persistence/database';
import type { AssetRepository, AssetRecord, AssetError } from '@/domain/ports';
import { createAssetId, type AssetId, type Result } from '@/domain/design';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export class IndexedDbAssetRepository implements AssetRepository {
  private dbPromise: Promise<IDBPDatabase>;
  private urlCache = new Map<AssetId, string>();

  constructor(dbPromise?: Promise<IDBPDatabase>) {
    this.dbPromise = dbPromise || getSharedDatabase();
  }

  async upload(file: File): Promise<Result<AssetRecord, AssetError>> {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return {
        ok: false,
        error: { kind: 'unsupported-file', mimeType: file.type || 'unknown' },
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        ok: false,
        error: { kind: 'file-too-large', maxBytes: MAX_FILE_SIZE },
      };
    }

    try {
      const id = createAssetId();
      const dims = await this.getImageDimensions(file);

      const record: AssetRecord = {
        id,
        name: file.name,
        mimeType: file.type as AssetRecord['mimeType'],
        width: dims.width,
        height: dims.height,
        byteSize: file.size,
        createdAt: new Date().toISOString(),
      };

      const db = await this.dbPromise;
      await db.put('assets_meta', record);
      await db.put('assets_blobs', file, id);

      return { ok: true, value: record };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : 'Failed to upload asset',
        },
      };
    }
  }

  async getRecord(id: AssetId): Promise<Result<AssetRecord, AssetError>> {
    try {
      const db = await this.dbPromise;
      const record = (await db.get('assets_meta', id)) as AssetRecord | undefined;
      if (!record) {
        return { ok: false, error: { kind: 'not-found', id } };
      }
      return { ok: true, value: record };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : `Failed to load asset meta ${id}`,
        },
      };
    }
  }

  async getUrl(id: AssetId): Promise<Result<string, AssetError>> {
    if (this.urlCache.has(id)) {
      return { ok: true, value: this.urlCache.get(id)! };
    }

    try {
      const db = await this.dbPromise;
      const blob = (await db.get('assets_blobs', id)) as Blob | undefined;
      if (!blob) {
        return { ok: false, error: { kind: 'not-found', id } };
      }

      const url = URL.createObjectURL(blob);
      this.urlCache.set(id, url);
      return { ok: true, value: url };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : `Failed to get asset url ${id}`,
        },
      };
    }
  }

  async list(): Promise<Result<AssetRecord[], AssetError>> {
    try {
      const db = await this.dbPromise;
      const all = (await db.getAll('assets_meta')) as AssetRecord[];
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { ok: true, value: all };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : 'Failed to list assets',
        },
      };
    }
  }

  async remove(id: AssetId): Promise<Result<void, AssetError>> {
    try {
      const cached = this.urlCache.get(id);
      if (cached) {
        URL.revokeObjectURL(cached);
        this.urlCache.delete(id);
      }

      const db = await this.dbPromise;
      await db.delete('assets_meta', id);
      await db.delete('assets_blobs', id);
      return { ok: true, value: undefined };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : `Failed to delete asset ${id}`,
        },
      };
    }
  }

  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      // In browser: Image element
      if (typeof Image !== 'undefined') {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 800 });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ width: 800, height: 800 });
        };
        img.src = url;
      } else {
        resolve({ width: 800, height: 800 });
      }
    });
  }
}
