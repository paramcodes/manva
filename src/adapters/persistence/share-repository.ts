import type { IDBPDatabase } from 'idb';
import { getSharedDatabase } from './database';
import type { DesignDocument, DesignId, Result } from '@/domain/design';

export type ShareRecord = {
  token: string;
  designId: DesignId;
  documentSnapshot: DesignDocument;
  createdAt: string;
  active: boolean;
};

export type ShareError =
  | { kind: 'not-found'; token: string }
  | { kind: 'revoked'; token: string }
  | { kind: 'storage-failure'; message: string };

export class LocalShareRepository {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(dbPromise?: Promise<IDBPDatabase>) {
    this.dbPromise = dbPromise || getSharedDatabase();
  }

  async createShare(doc: DesignDocument): Promise<Result<ShareRecord, ShareError>> {
    try {
      const db = await this.dbPromise;
      const token = 'sh_' + Math.random().toString(36).substring(2, 12);
      const record: ShareRecord = {
        token,
        designId: doc.id,
        documentSnapshot: JSON.parse(JSON.stringify(doc)),
        createdAt: new Date().toISOString(),
        active: true,
      };
      await db.put('shares', record);
      return { ok: true, value: record };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : 'Failed to create share record',
        },
      };
    }
  }

  async getShareByDesignId(designId: DesignId): Promise<Result<ShareRecord | null, ShareError>> {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction('shares', 'readonly');
      const index = tx.store.index('by_design');
      const all = (await index.getAll(designId)) as ShareRecord[];
      const active = all.find((r) => r.active);
      return { ok: true, value: active || null };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : 'Failed to query share record',
        },
      };
    }
  }

  async getShare(token: string): Promise<Result<ShareRecord, ShareError>> {
    try {
      const db = await this.dbPromise;
      const record = (await db.get('shares', token)) as ShareRecord | undefined;
      if (!record) {
        return { ok: false, error: { kind: 'not-found', token } };
      }
      if (!record.active) {
        return { ok: false, error: { kind: 'revoked', token } };
      }
      return { ok: true, value: record };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : 'Failed to get share record',
        },
      };
    }
  }

  async revokeShare(token: string): Promise<Result<void, ShareError>> {
    try {
      const db = await this.dbPromise;
      const record = (await db.get('shares', token)) as ShareRecord | undefined;
      if (record) {
        await db.put('shares', { ...record, active: false });
      }
      return { ok: true, value: undefined };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : 'Failed to revoke share',
        },
      };
    }
  }
}
