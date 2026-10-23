import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { LocalShareRepository } from './share-repository';
import { createDesignId, type DesignDocument } from '@/domain/design';

describe('LocalShareRepository', () => {
  let shareRepo: LocalShareRepository;

  beforeEach(async () => {
    const testDbName = `test_share_db_${Math.random().toString(36).substring(2, 9)}`;
    const dbPromise = openDB(testDbName, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('shares')) {
          const store = db.createObjectStore('shares', { keyPath: 'token' });
          store.createIndex('by_design', 'designId');
        }
      },
    });

    shareRepo = new LocalShareRepository(dbPromise);
  });

  it('creates, retrieves, and revokes share tokens', async () => {
    const docId = createDesignId();
    const doc: DesignDocument = {
      schemaVersion: 1,
      id: docId,
      title: 'Shared Poster',
      canvas: { width: 1200, height: 630, background: '#000000' },
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Create share
    const createRes = await shareRepo.createShare(doc);
    expect(createRes.ok).toBe(true);
    if (!createRes.ok) return;

    const token = createRes.value.token;
    expect(token).toMatch(/^sh_/);
    expect(createRes.value.active).toBe(true);
    expect(createRes.value.documentSnapshot.title).toBe('Shared Poster');

    // 2. Query by token
    const getRes = await shareRepo.getShare(token);
    expect(getRes.ok).toBe(true);
    if (!getRes.ok) return;
    expect(getRes.value.designId).toBe(docId);

    // 3. Query active share by design ID
    const byDesignRes = await shareRepo.getShareByDesignId(docId);
    expect(byDesignRes.ok).toBe(true);
    if (!byDesignRes.ok) return;
    expect(byDesignRes.value?.token).toBe(token);

    // 4. Revoke share
    const revokeRes = await shareRepo.revokeShare(token);
    expect(revokeRes.ok).toBe(true);

    // 5. Query after revoke returns revoked error
    const getAfterRevoke = await shareRepo.getShare(token);
    expect(getAfterRevoke.ok).toBe(false);
    if (!getAfterRevoke.ok) {
      expect(getAfterRevoke.error.kind).toBe('revoked');
    }
  });
});
