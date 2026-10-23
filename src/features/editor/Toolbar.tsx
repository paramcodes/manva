import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  Share2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useEditorStore } from '@/domain/editor';
import { Button } from '@/ui/Button';
import type { DesignRenderer } from '@/domain/ports';

interface ToolbarProps {
  onBack: () => void;
  renderer: DesignRenderer;
  onOpenShare?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onBack, renderer, onOpenShare }) => {
  const { document, past, future, saveStatus, undo, redo, dispatch } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(document.title);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== document.title) {
      dispatch({ type: 'update-title', title: titleInput.trim() });
    } else {
      setTitleInput(document.title);
    }
  };

  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      const res = await renderer.renderPng(document, 1);
      if (res.ok) {
        const url = URL.createObjectURL(res.value);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${document.title.toLowerCase().replace(/\s+/g, '-') || 'design'}.png`;
        window.document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        alert(`Export failed: ${res.error.kind}`);
      }
    } catch (err: unknown) {
      alert(`Export error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-zinc-400 hover:text-zinc-100"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Dashboard
        </Button>

        <div className="h-4 w-px bg-zinc-800" />

        {isEditingTitle ? (
          <input
            autoFocus
            className="bg-zinc-900 text-zinc-100 text-sm font-semibold px-2 py-1 rounded border border-indigo-500 outline-none"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setTitleInput(document.title);
                setIsEditingTitle(false);
              }
            }}
          />
        ) : (
          <button
            onClick={() => {
              setTitleInput(document.title);
              setIsEditingTitle(true);
            }}
            className="text-sm font-semibold text-zinc-200 hover:text-white px-2 py-1 rounded hover:bg-zinc-800/60 max-w-xs truncate"
            title="Click to rename"
          >
            {document.title}
          </button>
        )}

        {/* Save status badge */}
        <div className="flex items-center gap-1.5 text-xs font-medium pl-1">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-400/90">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Saved</span>
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-amber-400/90">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-red-400/90">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save error</span>
            </span>
          )}
        </div>
      </div>

      {/* Center: Undo / Redo */}
      <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800/60">
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
          className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={future.length === 0}
          title="Redo (Ctrl+Y)"
          className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onOpenShare && (
          <Button variant="secondary" size="sm" onClick={onOpenShare} className="gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={handleExportPng}
          disabled={isExporting}
          className="gap-1.5"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Export PNG
        </Button>
      </div>
    </header>
  );
};
