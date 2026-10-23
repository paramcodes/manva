import type { DesignDocument, ElementId, DesignCommand, Result, DesignError } from '@/domain/design';

export type SaveStatus = 'saved' | 'saving' | 'error';

export type EditorState = {
  document: DesignDocument;
  selectedIds: ElementId[];
  past: DesignDocument[];
  future: DesignDocument[];
  saveStatus: SaveStatus;
  zoom: number;
  pan: { x: number; y: number };
  activeTool: 'select' | 'text' | 'rectangle' | 'ellipse' | 'image';
};

export interface EditorActions {
  setDocument: (document: DesignDocument, resetHistory?: boolean) => void;
  dispatch: (command: DesignCommand) => Result<void, DesignError>;
  undo: () => void;
  redo: () => void;
  setSelection: (ids: ElementId[]) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setActiveTool: (tool: EditorState['activeTool']) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
}

export type EditorStore = EditorState & EditorActions;
