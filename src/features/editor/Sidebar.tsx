import React, { useState, useEffect } from 'react';
import {
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  LayoutTemplate,
  Upload,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '@/domain/editor';
import {
  createElementId,
  type TextElement,
  type ShapeElement,
  type ImageElement,
} from '@/domain/design';
import { STARTER_TEMPLATES, createFromTemplate } from '@/features/templates';
import type { AssetRepository, AssetRecord } from '@/domain/ports';

interface SidebarProps {
  assetRepo: AssetRepository;
}

type Tab = 'elements' | 'uploads' | 'templates';

export const Sidebar: React.FC<SidebarProps> = ({ assetRepo }) => {
  const [activeTab, setActiveTab] = useState<Tab>('elements');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assetUrls, setAssetUrls] = useState<Map<string, string>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { document, dispatch, setDocument } = useEditorStore();

  const loadAssets = async () => {
    const res = await assetRepo.list();
    if (res.ok) {
      setAssets(res.value);
      const urlMap = new Map<string, string>();
      for (const item of res.value) {
        const uRes = await assetRepo.getUrl(item.id);
        if (uRes.ok) urlMap.set(item.id, uRes.value);
      }
      setAssetUrls(urlMap);
    }
  };

  useEffect(() => {
    if (activeTab === 'uploads') {
      loadAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleAddText = (
    preset: 'heading' | 'subheading' | 'body' | 'serif'
  ) => {
    const centerX = Math.round(document.canvas.width / 2 - 250);
    const centerY = Math.round(document.canvas.height / 2 - 40);

    let newEl: TextElement;
    if (preset === 'heading') {
      newEl = {
        id: createElementId(),
        kind: 'text',
        text: 'Add a heading',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 54,
        fontWeight: 800,
        color: '#ffffff',
        textAlign: 'left',
        lineHeight: 1.15,
        x: centerX,
        y: centerY,
        width: 500,
        height: 80,
        rotation: 0,
        opacity: 1,
        locked: false,
      };
    } else if (preset === 'subheading') {
      newEl = {
        id: createElementId(),
        kind: 'text',
        text: 'Add a subheading',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 28,
        fontWeight: 600,
        color: '#a1a1aa',
        textAlign: 'left',
        lineHeight: 1.25,
        x: centerX,
        y: centerY,
        width: 500,
        height: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
      };
    } else if (preset === 'serif') {
      newEl = {
        id: createElementId(),
        kind: 'text',
        text: 'Editorial Headline',
        fontFamily: 'Playfair Display',
        fontSize: 60,
        fontWeight: 700,
        color: '#f4f4f5',
        textAlign: 'left',
        lineHeight: 1.2,
        x: centerX,
        y: centerY,
        width: 520,
        height: 90,
        rotation: 0,
        opacity: 1,
        locked: false,
      };
    } else {
      newEl = {
        id: createElementId(),
        kind: 'text',
        text: 'Type your body text here. Make it concise and readable.',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 20,
        fontWeight: 400,
        color: '#d4d4d8',
        textAlign: 'left',
        lineHeight: 1.4,
        x: centerX,
        y: centerY,
        width: 500,
        height: 60,
        rotation: 0,
        opacity: 1,
        locked: false,
      };
    }

    dispatch({ type: 'add-element', element: newEl });
  };

  const handleAddShape = (shape: 'rectangle' | 'rounded-rectangle' | 'ellipse') => {
    const centerX = Math.round(document.canvas.width / 2 - 120);
    const centerY = Math.round(document.canvas.height / 2 - 120);

    const newEl: ShapeElement = {
      id: createElementId(),
      kind: 'shape',
      shape: shape === 'ellipse' ? 'ellipse' : 'rectangle',
      x: centerX,
      y: centerY,
      width: 240,
      height: 240,
      rotation: 0,
      opacity: 1,
      locked: false,
      fill: '#6366f1',
      cornerRadius: shape === 'rounded-rectangle' ? 24 : 0,
    };

    dispatch({ type: 'add-element', element: newEl });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const res = await assetRepo.upload(file);
    setIsUploading(false);

    if (res.ok) {
      await loadAssets();
      // Place directly onto canvas
      handlePlaceImage(res.value);
    } else {
      if (res.error.kind === 'unsupported-file') {
        setUploadError(`Unsupported format: ${res.error.mimeType}. Use PNG, JPEG, or WebP.`);
      } else if (res.error.kind === 'file-too-large') {
        setUploadError('Image too large. Maximum size is 10MB.');
      } else {
        setUploadError(res.error.kind === 'storage-failure' ? res.error.message : res.error.kind);
      }
    }
    e.target.value = '';
  };

  const handlePlaceImage = (asset: AssetRecord) => {
    // Fit into 400x400 box keeping aspect ratio
    const aspect = asset.width / (asset.height || 1);
    let w = 400;
    let h = 400;
    if (aspect > 1) {
      h = Math.round(400 / aspect);
    } else {
      w = Math.round(400 * aspect);
    }

    const centerX = Math.round((document.canvas.width - w) / 2);
    const centerY = Math.round((document.canvas.height - h) / 2);

    const newEl: ImageElement = {
      id: createElementId(),
      kind: 'image',
      assetId: asset.id,
      x: centerX,
      y: centerY,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      locked: false,
      crop: { x: 0, y: 0, width: 1, height: 1 },
    };

    dispatch({ type: 'add-element', element: newEl });
  };

  const handleDeleteAsset = async (id: AssetRecord['id'], e: React.MouseEvent) => {
    e.stopPropagation();
    await assetRepo.remove(id);
    loadAssets();
  };

  return (
    <aside className="w-80 border-r border-zinc-800/80 bg-zinc-950 flex flex-col shrink-0 z-10">
      {/* Navigation tabs */}
      <div className="flex border-b border-zinc-800/80 p-2 gap-1 bg-zinc-900/30">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'elements'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          Elements
        </button>
        <button
          onClick={() => setActiveTab('uploads')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'uploads'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Uploads
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Templates
        </button>
      </div>

      {/* Tab contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'elements' && (
          <>
            {/* Text Presets */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Text Styles
                </h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => handleAddText('heading')}
                  className="w-full text-left p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all cursor-pointer group"
                >
                  <span className="text-xl font-extrabold text-zinc-100 group-hover:text-white block">
                    Add a heading
                  </span>
                  <span className="text-xs text-zinc-500">Sans-serif 54px Bold</span>
                </button>
                <button
                  onClick={() => handleAddText('serif')}
                  className="w-full text-left p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all cursor-pointer group"
                >
                  <span className="text-xl font-bold font-serif text-zinc-100 group-hover:text-white block">
                    Editorial Headline
                  </span>
                  <span className="text-xs text-zinc-500">Playfair Display 60px</span>
                </button>
                <button
                  onClick={() => handleAddText('subheading')}
                  className="w-full text-left p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all cursor-pointer group"
                >
                  <span className="text-base font-semibold text-zinc-200 group-hover:text-white block">
                    Add a subheading
                  </span>
                  <span className="text-xs text-zinc-500">Sans-serif 28px Semi-bold</span>
                </button>
                <button
                  onClick={() => handleAddText('body')}
                  className="w-full text-left p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all cursor-pointer group"
                >
                  <span className="text-sm text-zinc-300 group-hover:text-white block">
                    Add body text
                  </span>
                  <span className="text-xs text-zinc-500">Sans-serif 20px Regular</span>
                </button>
              </div>
            </div>

            {/* Shapes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Square className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Shapes
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAddShape('rectangle')}
                  className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-900 flex flex-col items-center gap-2 transition-all cursor-pointer text-zinc-300 hover:text-white"
                >
                  <Square className="w-6 h-6 fill-current text-indigo-500/30" />
                  <span className="text-[11px] font-medium">Rectangle</span>
                </button>
                <button
                  onClick={() => handleAddShape('rounded-rectangle')}
                  className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-900 flex flex-col items-center gap-2 transition-all cursor-pointer text-zinc-300 hover:text-white"
                >
                  <div className="w-6 h-6 border-2 border-indigo-400 bg-indigo-500/20 rounded-md" />
                  <span className="text-[11px] font-medium">Rounded</span>
                </button>
                <button
                  onClick={() => handleAddShape('ellipse')}
                  className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-900 flex flex-col items-center gap-2 transition-all cursor-pointer text-zinc-300 hover:text-white"
                >
                  <Circle className="w-6 h-6 fill-current text-violet-500/30" />
                  <span className="text-[11px] font-medium">Circle</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'uploads' && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="file-upload"
                className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-indigo-500 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 transition-all cursor-pointer text-center group"
              >
                <Upload className="w-8 h-8 text-zinc-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </span>
                <span className="text-xs text-zinc-500 mt-1">PNG, JPEG, WebP up to 10MB</span>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              {uploadError && (
                <div className="mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {uploadError}
                </div>
              )}
            </div>

            {/* Asset Gallery */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Your Images ({assets.length})
              </h4>
              {assets.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  No images uploaded yet. Upload one above to use it in your designs!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {assets.map((asset) => {
                    const url = assetUrls.get(asset.id);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => handlePlaceImage(asset)}
                        className="group relative aspect-square rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden cursor-pointer hover:border-indigo-500 transition-all"
                      >
                        {url ? (
                          <img
                            src={url}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                            Loading...
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          <button
                            title="Place on Canvas"
                            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete Image"
                            onClick={(e) => handleDeleteAsset(asset.id, e)}
                            className="p-1.5 rounded-lg bg-red-600/80 text-white hover:bg-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-zinc-300 truncate">
                          {asset.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Pick a starter composition. This will load into your current editor session.
            </p>
            <div className="space-y-3">
              {STARTER_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => {
                    if (confirm(`Load template "${tpl.title}"? Unsaved changes will be replaced.`)) {
                      setDocument(createFromTemplate(tpl));
                    }
                  }}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500 hover:bg-zinc-900 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                      {tpl.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                      {tpl.category}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {tpl.document.canvas.width} × {tpl.document.canvas.height} px •{' '}
                    {tpl.document.elements.length} elements
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
