import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { IndexedDbDesignRepository } from './indexeddb-design-repository';
import { IndexedDbAssetRepository } from '@/adapters/asset-storage/indexeddb-asset-repository';
import { createDesignId, type DesignDocument } from '@/domain/design';

describe('IndexedDB Repositories', () => {
  let dbPromise: ReturnType<typeof openDB>;
  let designRepo: IndexedDbDesignRepository;
  let assetRepo: IndexedDbAssetRepository;

  beforeEach(async () => {
    // Unique DB name per test to ensure clean state
    const testDbName = `test_db_${Math.random().toString(36).substring(2, 9)}`;
    dbPromise = openDB(testDbName, 1, {
      upgrade(db) {
        db.createObjectStore('designs', { keyPath: 'id' });
        db.createObjectStore('assets_meta', { keyPath: 'id' });
        db.createObjectStore('assets_blobs', { keyPath: 'id' });
      },
    });

    designRepo = new IndexedDbDesignRepository(dbPromise);
    assetRepo = new IndexedDbAssetRepository(dbPromise);
  });

  it('saves, lists, loads, and deletes designs', async () => {
    const docId = createDesignId();
    const doc: DesignDocument = {
      schemaVersion: 1,
      id: docId,
      title: 'Persistent Poster',
      canvas: { width: 1080, height: 1080, background: '#121212' },
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save
    const saveRes = await designRepo.save(doc);
    expect(saveRes.ok).toBe(true);

    // List
    const listRes = await designRepo.list();
    expect(listRes.ok).toBe(true);
    if (listRes.ok) {
      expect(listRes.value).toHaveLength(1);
      expect(listRes.value[0].title).toBe('Persistent Poster');
    }

    // Load
    const loadRes = await designRepo.load(docId);
    expect(loadRes.ok).toBe(true);
    if (loadRes.ok) {
      expect(loadRes.value.id).toBe(docId);
    }

    // Remove
    const removeRes = await designRepo.remove(docId);
    expect(removeRes.ok).toBe(true);

    const loadAfterRemove = await designRepo.load(docId);
    expect(loadAfterRemove.ok).toBe(false);
  });

  it('rejects unsupported asset types and large files', async () => {
    const fakeTextFile = new File(['hello'], 'document.txt', { type: 'text/plain' });
    const uploadRes = await assetRepo.upload(fakeTextFile);
    expect(uploadRes.ok).toBe(false);
    if (!uploadRes.ok) {
      expect(uploadRes.error.kind).toBe('unsupported-file');
    }
  });
});
