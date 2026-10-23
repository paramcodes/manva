import type {
  DesignDocument,
  DesignElement,
  TextElement,
  ImageElement,
  ShapeElement,
  Result,
  DesignError,
} from './types';

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function validateElementBase(el: unknown): string | null {
  if (!isObject(el)) return 'Element must be an object';
  if (typeof el.id !== 'string' || !el.id) return 'Element id must be a non-empty string';
  if (typeof el.x !== 'number' || Number.isNaN(el.x)) return 'Element x must be a number';
  if (typeof el.y !== 'number' || Number.isNaN(el.y)) return 'Element y must be a number';
  if (typeof el.width !== 'number' || el.width < 0 || Number.isNaN(el.width))
    return 'Element width must be a non-negative number';
  if (typeof el.height !== 'number' || el.height < 0 || Number.isNaN(el.height))
    return 'Element height must be a non-negative number';
  if (typeof el.rotation !== 'number' || Number.isNaN(el.rotation))
    return 'Element rotation must be a number';
  if (typeof el.opacity !== 'number' || el.opacity < 0 || el.opacity > 1)
    return 'Element opacity must be between 0 and 1';
  if (typeof el.locked !== 'boolean') return 'Element locked must be a boolean';
  return null;
}

export function validateElement(el: unknown): Result<DesignElement, string> {
  const baseErr = validateElementBase(el);
  if (baseErr) return { ok: false, error: baseErr };

  const obj = el as Record<string, unknown>;
  const kind = obj.kind;

  if (kind === 'text') {
    if (typeof obj.text !== 'string') return { ok: false, error: 'text must be a string' };
    if (typeof obj.fontFamily !== 'string') return { ok: false, error: 'fontFamily must be a string' };
    if (typeof obj.fontSize !== 'number' || obj.fontSize <= 0)
      return { ok: false, error: 'fontSize must be > 0' };
    if (typeof obj.fontWeight !== 'number') return { ok: false, error: 'fontWeight must be a number' };
    if (typeof obj.color !== 'string') return { ok: false, error: 'color must be a string' };
    if (!['left', 'center', 'right'].includes(obj.textAlign as string))
      return { ok: false, error: 'textAlign must be left, center, or right' };
    if (typeof obj.lineHeight !== 'number' || obj.lineHeight <= 0)
      return { ok: false, error: 'lineHeight must be > 0' };
    return { ok: true, value: obj as unknown as TextElement };
  }

  if (kind === 'image') {
    if (typeof obj.assetId !== 'string' || !obj.assetId)
      return { ok: false, error: 'assetId must be a non-empty string' };
    if (!isObject(obj.crop)) return { ok: false, error: 'crop must be an object' };
    const { x, y, width, height } = obj.crop;
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      x < 0 ||
      y < 0 ||
      width <= 0 ||
      height <= 0
    ) {
      return { ok: false, error: 'crop coordinates must be positive numbers within valid range' };
    }
    return { ok: true, value: obj as unknown as ImageElement };
  }

  if (kind === 'shape') {
    if (!['rectangle', 'ellipse'].includes(obj.shape as string))
      return { ok: false, error: 'shape must be rectangle or ellipse' };
    if (typeof obj.fill !== 'string') return { ok: false, error: 'fill must be a string' };
    if (obj.stroke !== undefined && typeof obj.stroke !== 'string')
      return { ok: false, error: 'stroke must be a string if defined' };
    if (obj.strokeWidth !== undefined && (typeof obj.strokeWidth !== 'number' || obj.strokeWidth < 0))
      return { ok: false, error: 'strokeWidth must be >= 0' };
    if (obj.cornerRadius !== undefined && (typeof obj.cornerRadius !== 'number' || obj.cornerRadius < 0))
      return { ok: false, error: 'cornerRadius must be >= 0' };
    return { ok: true, value: obj as unknown as ShapeElement };
  }

  return { ok: false, error: `Unknown element kind: ${String(kind)}` };
}

export function validateDocument(input: unknown): Result<DesignDocument, DesignError> {
  if (!isObject(input)) {
    return { ok: false, error: { kind: 'invalid-document', message: 'Document must be an object' } };
  }

  if (input.schemaVersion !== 1) {
    return {
      ok: false,
      error: {
        kind: 'invalid-document',
        message: `Unsupported schemaVersion: ${String(input.schemaVersion)}. Expected 1`,
      },
    };
  }

  if (typeof input.id !== 'string' || !input.id) {
    return { ok: false, error: { kind: 'invalid-document', message: 'Missing or invalid id' } };
  }

  if (typeof input.title !== 'string') {
    return { ok: false, error: { kind: 'invalid-document', message: 'Missing or invalid title' } };
  }

  if (!isObject(input.canvas)) {
    return { ok: false, error: { kind: 'invalid-document', message: 'Missing or invalid canvas' } };
  }

  const { width, height, background } = input.canvas;
  if (typeof width !== 'number' || width <= 0 || typeof height !== 'number' || height <= 0) {
    return {
      ok: false,
      error: { kind: 'invalid-document', message: 'Canvas dimensions must be positive numbers' },
    };
  }
  if (typeof background !== 'string') {
    return { ok: false, error: { kind: 'invalid-document', message: 'Canvas background must be a string' } };
  }

  if (!Array.isArray(input.elements)) {
    return { ok: false, error: { kind: 'invalid-document', message: 'Elements must be an array' } };
  }

  const validatedElements: DesignElement[] = [];
  for (let i = 0; i < input.elements.length; i++) {
    const elRes = validateElement(input.elements[i]);
    if (!elRes.ok) {
      return {
        ok: false,
        error: {
          kind: 'invalid-document',
          message: `Element at index ${i} is invalid: ${elRes.error}`,
        },
      };
    }
    validatedElements.push(elRes.value);
  }

  if (typeof input.createdAt !== 'string' || typeof input.updatedAt !== 'string') {
    return {
      ok: false,
      error: { kind: 'invalid-document', message: 'Missing createdAt or updatedAt timestamp' },
    };
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      id: input.id as DesignDocument['id'],
      title: input.title,
      canvas: {
        width,
        height,
        background,
      },
      elements: validatedElements,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    },
  };
}
