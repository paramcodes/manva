import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './store';
import { createElementId, type TextElement } from '@/domain/design';

describe('Editor Store & Session', () => {
  beforeEach(() => {
    const state = useEditorStore.getState();
    state.setDocument(state.document, true);
    state.clearSelection();
  });

  it('applies commands and records undo history', () => {
    const store = useEditorStore.getState();
    const initialCount = store.document.elements.length;

    const newElement: TextElement = {
      id: createElementId(),
      kind: 'text',
      text: 'Added via test',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 24,
      fontWeight: 500,
      color: '#fff',
      textAlign: 'left',
      lineHeight: 1.2,
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
    };

    const res = store.dispatch({ type: 'add-element', element: newElement });
    expect(res.ok).toBe(true);

    const afterAdd = useEditorStore.getState();
    expect(afterAdd.document.elements.length).toBe(initialCount + 1);
    expect(afterAdd.past.length).toBe(1);

    // Undo
    afterAdd.undo();
    const afterUndo = useEditorStore.getState();
    expect(afterUndo.document.elements.length).toBe(initialCount);
    expect(afterUndo.future.length).toBe(1);

    // Redo
    afterUndo.redo();
    const afterRedo = useEditorStore.getState();
    expect(afterRedo.document.elements.length).toBe(initialCount + 1);
    expect(afterRedo.future.length).toBe(0);
  });

  it('duplicates selected elements with offset and new IDs', () => {
    const store = useEditorStore.getState();
    const target = store.document.elements[0];
    store.setSelection([target.id]);

    store.duplicateSelected();

    const after = useEditorStore.getState();
    expect(after.document.elements.length).toBe(store.document.elements.length + 1);
    expect(after.selectedIds.length).toBe(1);
    expect(after.selectedIds[0]).not.toBe(target.id);

    const duplicated = after.document.elements.find((e) => e.id === after.selectedIds[0]);
    expect(duplicated).toBeDefined();
    expect(duplicated?.x).toBe(target.x + 24);
    expect(duplicated?.y).toBe(target.y + 24);
  });

  it('deletes selected elements and clears selection', () => {
    const store = useEditorStore.getState();
    const target = store.document.elements[0];
    store.setSelection([target.id]);

    store.deleteSelected();

    const after = useEditorStore.getState();
    expect(after.document.elements.some((e) => e.id === target.id)).toBe(false);
    expect(after.selectedIds).toEqual([]);
  });
});
