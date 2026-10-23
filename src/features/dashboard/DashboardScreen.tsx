import React, { useState, useEffect } from 'react';
import {
  Plus,
  LayoutTemplate,
  Trash2,
  Copy,
  Edit2,
  Calendar,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import type { DesignSummary, DesignId, DesignDocument } from '@/domain/design';
import { createDesignId } from '@/domain/design';
import { STARTER_TEMPLATES, createFromTemplate } from '@/features/templates';
import type { DesignRepository } from '@/domain/ports';
import { Button } from '@/ui/Button';

interface DashboardScreenProps {
  designRepo: DesignRepository;
  onOpenDesign: (doc: DesignDocument) => void;
  onSelectShare?: (id: DesignId) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  designRepo,
  onOpenDesign,
  onSelectShare: _onSelectShare,
}) => {
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<DesignId | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const loadDesigns = async () => {
    setIsLoading(true);
    setError(null);
    const res = await designRepo.list();
    setIsLoading(false);
    if (res.ok) {
      setDesigns(res.value);
    } else {
      setError(res.error.kind === 'storage-failure' ? res.error.message : res.error.kind);
    }
  };

  useEffect(() => {
    loadDesigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateBlank = async (width: number, height: number, name: string) => {
    const id = createDesignId();
    const now = new Date().toISOString();
    const blankDoc: DesignDocument = {
      schemaVersion: 1,
      id,
      title: name,
      canvas: {
        width,
        height,
        background: '#09090b',
      },
      elements: [],
      createdAt: now,
      updatedAt: now,
    };

    await designRepo.save(blankDoc);
    onOpenDesign(blankDoc);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    const tpl = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const newDoc = createFromTemplate(tpl);
    await designRepo.save(newDoc);
    onOpenDesign(newDoc);
  };

  const handleOpen = async (id: DesignId) => {
    const res = await designRepo.load(id);
    if (res.ok) {
      onOpenDesign(res.value);
    } else {
      alert(`Failed to load design: ${res.error.kind}`);
    }
  };

  const handleDuplicate = async (id: DesignId, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await designRepo.load(id);
    if (res.ok) {
      const copy: DesignDocument = {
        ...res.value,
        id: createDesignId(),
        title: `${res.value.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await designRepo.save(copy);
      loadDesigns();
    }
  };

  const handleDelete = async (id: DesignId, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      await designRepo.remove(id);
      loadDesigns();
    }
  };

  const handleRenameSubmit = async (id: DesignId, e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    const res = await designRepo.load(id);
    if (res.ok) {
      await designRepo.save({
        ...res.value,
        title: editTitle.trim(),
        updatedAt: new Date().toISOString(),
      });
      setEditingId(null);
      loadDesigns();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Dashboard Header */}
      <header className="h-16 border-b border-zinc-800/80 px-8 flex items-center justify-between bg-zinc-950/60 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-950">
            M
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-base text-zinc-100 leading-tight">
              Manva Studio
            </h1>
            <p className="text-[11px] text-zinc-500">Social Graphics & Design Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCreateBlank(1080, 1080, 'Untitled Square')}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Blank
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-10">
        {/* Templates Banner */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Start with a curated template
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STARTER_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => handleCreateFromTemplate(tpl.id)}
                className="group relative p-5 rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 border border-zinc-800/80 hover:border-indigo-500/80 hover:shadow-xl hover:shadow-indigo-950/20 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {tpl.category}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {tpl.document.canvas.width} × {tpl.document.canvas.height}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-100 group-hover:text-indigo-200 transition-colors">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {tpl.document.elements.length} stylized vector elements
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between pt-3 border-t border-zinc-800/60">
                  <span className="text-xs font-medium text-indigo-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Use template →
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Designs Library */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Recent Designs ({designs.length})
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">Loading your designs...</div>
          ) : error ? (
            <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          ) : designs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-zinc-800/80 bg-zinc-900/20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-200">No designs created yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Choose a template above or click New Blank to create your first social graphic.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCreateBlank(1080, 1080, 'Untitled Square')}
                className="mt-2"
              >
                Create First Graphic
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {designs.map((design) => (
                <div
                  key={design.id}
                  onClick={() => handleOpen(design.id)}
                  className="group relative p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/60 hover:bg-zinc-900 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Visual Card Preview Silhouette */}
                    <div className="aspect-[4/3] rounded-xl bg-zinc-950 border border-zinc-800/60 mb-3 flex items-center justify-center overflow-hidden group-hover:border-zinc-700 transition-colors">
                      <div className="text-zinc-600 text-xs font-mono flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Studio</span>
                      </div>
                    </div>

                    {editingId === design.id ? (
                      <form
                        onSubmit={(e) => handleRenameSubmit(design.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="mb-1"
                      >
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={(e) => handleRenameSubmit(design.id, e)}
                          className="w-full bg-zinc-800 text-sm font-semibold text-white px-2 py-0.5 rounded border border-indigo-500 outline-none"
                        />
                      </form>
                    ) : (
                      <h4 className="font-semibold text-sm text-zinc-100 group-hover:text-indigo-200 truncate transition-colors">
                        {design.title}
                      </h4>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(design.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(design.id);
                        setEditTitle(design.title);
                      }}
                      className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(design.id, e)}
                      className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(design.id, design.title, e)}
                      className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
