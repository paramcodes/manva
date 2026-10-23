import type {
  DesignDocument,
  DesignId,
  AssetId,
  DesignSummary,
  Result,
  DesignError,
} from '@/domain/design';

export type AssetRecord = {
  id: AssetId;
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  byteSize: number;
  createdAt: string;
};

export type AssetError =
  | { kind: 'unsupported-file'; mimeType: string }
  | { kind: 'file-too-large'; maxBytes: number }
  | { kind: 'not-found'; id: AssetId }
  | { kind: 'storage-failure'; message: string };

export type ExportError =
  | { kind: 'asset-unavailable'; id: AssetId }
  | { kind: 'render-failure'; message: string };

export interface DesignRepository {
  list(): Promise<Result<DesignSummary[], DesignError>>;
  load(id: DesignId): Promise<Result<DesignDocument, DesignError>>;
  save(document: DesignDocument): Promise<Result<void, DesignError>>;
  remove(id: DesignId): Promise<Result<void, DesignError>>;
}

export interface AssetRepository {
  upload(file: File): Promise<Result<AssetRecord, AssetError>>;
  getUrl(id: AssetId): Promise<Result<string, AssetError>>;
  getRecord(id: AssetId): Promise<Result<AssetRecord, AssetError>>;
  list(): Promise<Result<AssetRecord[], AssetError>>;
  remove(id: AssetId): Promise<Result<void, AssetError>>;
}

export interface DesignRenderer {
  renderPng(document: DesignDocument, scale?: number): Promise<Result<Blob, ExportError>>;
}
