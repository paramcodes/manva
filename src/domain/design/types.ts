export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type DesignId = Brand<string, 'DesignId'>;
export type ElementId = Brand<string, 'ElementId'>;
export type AssetId = Brand<string, 'AssetId'>;

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type DesignError =
  | { kind: 'not-found'; id: DesignId }
  | { kind: 'element-not-found'; id: ElementId }
  | { kind: 'invalid-document'; message: string }
  | { kind: 'storage-failure'; message: string };

export type ElementBase = {
  id: ElementId;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
};

export type TextElement = ElementBase & {
  kind: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
};

export type ImageElement = ElementBase & {
  kind: 'image';
  assetId: AssetId;
  /** Normalized coordinates within original image: [0..1] range */
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type ShapeElement = ElementBase & {
  kind: 'shape';
  shape: 'rectangle' | 'ellipse';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
};

export type DesignElement = TextElement | ImageElement | ShapeElement;

export type CanvasConfig = {
  width: number;
  height: number;
  background: string;
};

export type DesignDocument = {
  schemaVersion: 1;
  id: DesignId;
  title: string;
  canvas: CanvasConfig;
  /** Array order is stacking order: first is background/back, last is foreground/front */
  elements: DesignElement[];
  createdAt: string;
  updatedAt: string;
};

export type DesignSummary = Pick<DesignDocument, 'id' | 'title' | 'updatedAt'> & {
  thumbnailAssetId?: AssetId;
};

export type Template = {
  id: string;
  title: string;
  category: 'social-post' | 'story';
  previewUrl: string;
  document: Omit<DesignDocument, 'id' | 'createdAt' | 'updatedAt'>;
};

export type DesignCommand =
  | { type: 'add-element'; element: DesignElement }
  | { type: 'replace-element'; element: DesignElement }
  | { type: 'delete-elements'; ids: ElementId[] }
  | { type: 'reorder-element'; id: ElementId; position: 'back' | 'forward' | 'front' | 'to-back' }
  | { type: 'set-background'; color: string }
  | { type: 'update-canvas-size'; width: number; height: number }
  | { type: 'update-title'; title: string };
