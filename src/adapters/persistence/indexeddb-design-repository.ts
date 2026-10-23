import type { IDBPDatabase } from 'idb';
import { getSharedDatabase } from './database';
import type { DesignDocument, DesignId, DesignSummary, Result, DesignError } from '@/domain/design';
import { validateDocument } from '@/domain/design';
import type { DesignRepository } from '@/domain/ports';

export class IndexedDbDesignRepository implements DesignRepository {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(dbPromise?: Promise<IDBPDatabase>) {
    this.dbPromise = dbPromise || getSharedDatabase();
  }

  async list(): Promise<Result<DesignSummary[], DesignError>> {
    try {
      const db = await this.dbPromise;
      const all = (await db.getAll('designs')) as DesignDocument[];
      const summaries: DesignSummary[] = all.map((d) => ({
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt,
      }));
      // Sort by updatedAt descending
      summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return { ok: true, value: summaries };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : 'Failed to list designs',
        },
      };
    }
  }

  async load(id: DesignId): Promise<Result<DesignDocument, DesignError>> {
    try {
      const db = await this.dbPromise;
      const raw = await db.get('designs', id);
      if (!raw) {
        return { ok: false, error: { kind: 'not-found', id } };
      }
      const validated = validateDocument(raw);
      if (!validated.ok) {
        return { ok: false, error: validated.error };
      }
      return { ok: true, value: validated.value };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : `Failed to load design ${id}`,
        },
      };
    }
  }

  async save(document: DesignDocument): Promise<Result<void, DesignError>> {
    const validated = validateDocument(document);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    try {
      const db = await this.dbPromise;
      await db.put('designs', validated.value);
      return { ok: true, value: undefined };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : `Failed to save design ${document.id}`,
        },
      };
    }
  }

  async remove(id: DesignId): Promise<Result<void, DesignError>> {
    try {
      const db = await this.dbPromise;
      await db.delete('designs', id);
      return { ok: true, value: undefined };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'storage-failure',
          message: err instanceof Error ? err.message : `Failed to remove design ${id}`,
        },
      };
    }
  }
}
