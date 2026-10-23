import { create } from 'zustand';
import type { EditorStore, EditorState } from './types';
import {
  applyCommand,
  createElementId,
  type DesignDocument,
  type DesignCommand,
  type ElementId,
  type DesignElement,
} from '@/domain/design';
import { STARTER_TEMPLATES, createFromTemplate } from '@/features/templates';

const MAX_HISTORY = 50;

const initialDoc: DesignDocument = createFromTemplate(STARTER_TEMPLATES[0]);

const initialEditorState: EditorState = {
  document: initialDoc,
  selectedIds: [],
  past: [],
  future: [],
  saveStatus: 'saved',
  zoom: 1,
  pan: { x: 0, y: 0 },
  activeTool: 'select',
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialEditorState,

  setDocument: (document, resetHistory = true) => {
    set({
      document,
      selectedIds: [],
      past: resetHistory ? [] : get().past,
      future: resetHistory ? [] : get().future,
      saveStatus: 'saved',
    });
  },

  dispatch: (command: DesignCommand) => {
    const { document, past } = get();
    const result = applyCommand(document, command);

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const nextPast = [...past.slice(-(MAX_HISTORY - 1)), document];

    set({
      document: result.value,
      past: nextPast,
      future: [], // Clear redo stack on new command
      saveStatus: 'saving',
    });

    return { ok: true, value: undefined };
  },

  undo: () => {
    const { past, document, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const newFuture = [document, ...future];

    // Filter selection to elements that exist in the restored document
    const validIds = new Set(previous.elements.map((e) => e.id));
    const nextSelection = get().selectedIds.filter((id) => validIds.has(id));

    set({
      document: previous,
      past: newPast,
      future: newFuture,
      selectedIds: nextSelection,
      saveStatus: 'saving',
    });
  },

  redo: () => {
    const { future, document, past } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past, document];

    const validIds = new Set(next.elements.map((e) => e.id));
    const nextSelection = get().selectedIds.filter((id) => validIds.has(id));

    set({
      document: next,
      past: newPast,
      future: newFuture,
      selectedIds: nextSelection,
      saveStatus: 'saving',
    });
  },

  setSelection: (ids: ElementId[]) => {
    const validIds = new Set(get().document.elements.map((e) => e.id));
    set({ selectedIds: ids.filter((id) => validIds.has(id)) });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  setZoom: (zoom: number) => {
    const clamped = Math.min(Math.max(zoom, 0.1), 4);
    set({ zoom: clamped });
  },

  setPan: (pan: { x: number; y: number }) => {
    set({ pan });
  },

  setSaveStatus: (saveStatus) => {
    set({ saveStatus });
  },

  setActiveTool: (activeTool) => {
    set({ activeTool });
  },

  duplicateSelected: () => {
    const { document, selectedIds, dispatch } = get();
    if (selectedIds.length === 0) return;

    const toDuplicate = document.elements.filter((el) => selectedIds.includes(el.id));
    const newIds: ElementId[] = [];

    for (const el of toDuplicate) {
      const newId = createElementId();
      newIds.push(newId);
      const cloned: DesignElement = {
        ...el,
        id: newId,
        x: el.x + 24,
        y: el.y + 24,
      };
      dispatch({ type: 'add-element', element: cloned });
    }

    set({ selectedIds: newIds });
  },

  deleteSelected: () => {
    const { selectedIds, dispatch } = get();
    if (selectedIds.length === 0) return;

    dispatch({ type: 'delete-elements', ids: selectedIds });
    set({ selectedIds: [] });
  },
}));
