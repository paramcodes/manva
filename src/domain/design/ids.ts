import type { DesignId, ElementId, AssetId } from './types';

export function createDesignId(): DesignId {
  return (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'des_' + Math.random().toString(36).substring(2, 11)) as DesignId;
}

export function createElementId(): ElementId {
  return (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'elem_' + Math.random().toString(36).substring(2, 11)) as ElementId;
}

export function createAssetId(): AssetId {
  return (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'ast_' + Math.random().toString(36).substring(2, 11)) as AssetId;
}
