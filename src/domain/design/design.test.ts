import { describe, it, expect } from 'vitest';
import {
  validateDocument,
  applyCommand,
  createDesignId,
  createElementId,
  createAssetId,
  type DesignDocument,
  type TextElement,
  type ShapeElement,
  type ImageElement,
} from './index';
import { STARTER_TEMPLATES, createFromTemplate } from '@/features/templates';

describe('Design Model & Validation', () => {
  const validDoc: DesignDocument = {
    schemaVersion: 1,
    id: createDesignId(),
    title: 'Test Design',
    canvas: {
      width: 1080,
      height: 1080,
      background: '#ffffff',
    },
    elements: [
      {
        id: createElementId(),
        kind: 'text',
        text: 'Hello World',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 32,
        fontWeight: 600,
        color: '#000000',
        textAlign: 'center',
        lineHeight: 1.2,
        x: 100,
        y: 100,
        width: 400,
        height: 100,
        rotation: 0,
        opacity: 1,
        locked: false,
      },
    ],
    createdAt: '2026-10-23T10:00:00.000Z',
    updatedAt: '2026-10-23T10:00:00.000Z',
  };

  it('validates a valid document', () => {
    const result = validateDocument(validDoc);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Test Design');
      expect(result.value.elements).toHaveLength(1);
    }
  });

  it('rejects documents with missing or invalid schemaVersion', () => {
    const invalid = { ...validDoc, schemaVersion: 99 };
    const result = validateDocument(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === 'invalid-document') {
      expect(result.error.kind).toBe('invalid-document');
      expect(result.error.message).toContain('Unsupported schemaVersion');
    }
  });

  it('rejects documents with invalid canvas dimensions', () => {
    const invalid = {
      ...validDoc,
      canvas: { width: -100, height: 1080, background: '#fff' },
    };
    const result = validateDocument(invalid);
    expect(result.ok).toBe(false);
  });

  it('rejects documents with invalid element kinds', () => {
    const invalid = {
      ...validDoc,
      elements: [{ id: '1', kind: 'audio', x: 0, y: 0, width: 10, height: 10, rotation: 0, opacity: 1, locked: false }],
    };
    const result = validateDocument(invalid);
    expect(result.ok).toBe(false);
  });

  it('validates shape and image elements properly', () => {
    const shape: ShapeElement = {
      id: createElementId(),
      kind: 'shape',
      shape: 'rectangle',
      fill: '#ff0000',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 0.8,
      locked: false,
      cornerRadius: 16,
    };

    const image: ImageElement = {
      id: createElementId(),
      kind: 'image',
      assetId: createAssetId(),
      crop: { x: 0, y: 0, width: 1, height: 1 },
      x: 50,
      y: 50,
      width: 300,
      height: 300,
      rotation: 0,
      opacity: 1,
      locked: false,
    };

    const doc: DesignDocument = {
      ...validDoc,
      elements: [shape, image],
    };

    const res = validateDocument(doc);
    expect(res.ok).toBe(true);
  });
});

describe('Design Commands', () => {
  const baseDoc: DesignDocument = {
    schemaVersion: 1,
    id: createDesignId(),
    title: 'Command Test',
    canvas: { width: 800, height: 600, background: '#000000' },
    elements: [],
    createdAt: '2026-10-23T10:00:00.000Z',
    updatedAt: '2026-10-23T10:00:00.000Z',
  };

  it('adds an element to the top of stacking order', () => {
    const el1: TextElement = {
      id: createElementId(),
      kind: 'text',
      text: 'First',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 20,
      fontWeight: 400,
      color: '#fff',
      textAlign: 'left',
      lineHeight: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
    };

    const el2: TextElement = {
      ...el1,
      id: createElementId(),
      text: 'Second',
    };

    const step1 = applyCommand(baseDoc, { type: 'add-element', element: el1 });
    expect(step1.ok).toBe(true);
    if (!step1.ok) return;

    const step2 = applyCommand(step1.value, { type: 'add-element', element: el2 });
    expect(step2.ok).toBe(true);
    if (!step2.ok) return;

    expect(step2.value.elements).toHaveLength(2);
    expect(step2.value.elements[0].id).toBe(el1.id);
    expect(step2.value.elements[1].id).toBe(el2.id);
  });

  it('replaces an element in-place', () => {
    const el: TextElement = {
      id: createElementId(),
      kind: 'text',
      text: 'Original',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 20,
      fontWeight: 400,
      color: '#fff',
      textAlign: 'left',
      lineHeight: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
    };

    const docWithEl = applyCommand(baseDoc, { type: 'add-element', element: el });
    if (!docWithEl.ok) throw new Error('add failed');

    const updated = applyCommand(docWithEl.value, {
      type: 'replace-element',
      element: { ...el, text: 'Modified Text' },
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect((updated.value.elements[0] as TextElement).text).toBe('Modified Text');
  });

  it('reorders elements preserving stacking order', () => {
    const idA = createElementId();
    const idB = createElementId();
    const idC = createElementId();

    const makeEl = (id: typeof idA): ShapeElement => ({
      id,
      kind: 'shape',
      shape: 'rectangle',
      fill: '#fff',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
    });

    let doc: DesignDocument = {
      ...baseDoc,
      elements: [makeEl(idA), makeEl(idB), makeEl(idC)],
    };

    // Move A forward (should now be between B and C: B, A, C)
    const res1 = applyCommand(doc, { type: 'reorder-element', id: idA, position: 'forward' });
    expect(res1.ok).toBe(true);
    if (!res1.ok) return;
    expect(res1.value.elements.map((e) => e.id)).toEqual([idB, idA, idC]);

    // Move A to front (should be at the end: B, C, A)
    const res2 = applyCommand(res1.value, { type: 'reorder-element', id: idA, position: 'front' });
    expect(res2.ok).toBe(true);
    if (!res2.ok) return;
    expect(res2.value.elements.map((e) => e.id)).toEqual([idB, idC, idA]);

    // Move A to back (should be at index 0: A, B, C)
    const res3 = applyCommand(res2.value, { type: 'reorder-element', id: idA, position: 'to-back' });
    expect(res3.ok).toBe(true);
    if (!res3.ok) return;
    expect(res3.value.elements.map((e) => e.id)).toEqual([idA, idB, idC]);
  });
});

describe('Templates Instantiation', () => {
  it('instantiates a starter template with brand new IDs', () => {
    const template = STARTER_TEMPLATES[0];
    const newDesign = createFromTemplate(template);

    expect(newDesign.schemaVersion).toBe(1);
    expect(newDesign.title).toBe(template.title);
    expect(newDesign.canvas).toEqual(template.document.canvas);
    expect(newDesign.elements).toHaveLength(template.document.elements.length);

    // Verify IDs are distinct from template IDs
    const templateIds = new Set(template.document.elements.map((e) => e.id));
    for (const el of newDesign.elements) {
      expect(templateIds.has(el.id)).toBe(false);
    }

    // Verify all instantiated element IDs are unique among themselves
    const uniqueIds = new Set(newDesign.elements.map((e) => e.id));
    expect(uniqueIds.size).toBe(newDesign.elements.length);
  });
});
