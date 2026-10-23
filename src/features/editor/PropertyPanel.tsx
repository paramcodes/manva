import React, { useRef } from 'react';
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  Settings,
  Crop,
  Upload,
} from 'lucide-react';
import { useEditorStore } from '@/domain/editor';
import type { ImageElement } from '@/domain/design';
import type { AssetRepository } from '@/domain/ports';
import { Button } from '@/ui/Button';

interface PropertyPanelProps {
  assetRepo: AssetRepository;
}

const PRESET_COLORS = [
  '#000000',
  '#09090b',
  '#18181b',
  '#27272a',
  '#ffffff',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
];

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ assetRepo }) => {
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const {
    document,
    selectedIds,
    dispatch,
    duplicateSelected,
    deleteSelected,
  } = useEditorStore();

  const selectedElement =
    selectedIds.length === 1
      ? document.elements.find((el) => el.id === selectedIds[0])
      : null;

  // Handle Canvas Preset Size
  const handlePresetCanvas = (w: number, h: number) => {
    dispatch({ type: 'update-canvas-size', width: w, height: h });
  };

  // If no element is selected, show Canvas settings
  if (!selectedElement) {
    return (
      <aside className="w-72 border-l border-zinc-800/80 bg-zinc-950 p-4 flex flex-col gap-6 overflow-y-auto shrink-0 z-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Canvas Settings
            </h3>
          </div>

          <div className="space-y-4">
            {/* Dimensions */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                Dimensions (px)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Width</span>
                  <input
                    type="number"
                    min={100}
                    max={4000}
                    value={document.canvas.width}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (val > 0)
                        dispatch({
                          type: 'update-canvas-size',
                          width: val,
                          height: document.canvas.height,
                        });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Height</span>
                  <input
                    type="number"
                    min={100}
                    max={4000}
                    value={document.canvas.height}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (val > 0)
                        dispatch({
                          type: 'update-canvas-size',
                          width: document.canvas.width,
                          height: val,
                        });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <button
                  onClick={() => handlePresetCanvas(1080, 1080)}
                  className="py-1 text-[11px] rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80"
                >
                  1:1 Square
                </button>
                <button
                  onClick={() => handlePresetCanvas(1200, 630)}
                  className="py-1 text-[11px] rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80"
                >
                  Landscape
                </button>
                <button
                  onClick={() => handlePresetCanvas(1080, 1920)}
                  className="py-1 text-[11px] rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80"
                >
                  9:16 Story
                </button>
              </div>
            </div>

            {/* Canvas Background Color */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                Background Color
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="color"
                  value={document.canvas.background}
                  onChange={(e) =>
                    dispatch({ type: 'set-background', color: e.target.value })
                  }
                  className="w-8 h-8 rounded-lg cursor-pointer border border-zinc-800 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={document.canvas.background}
                  onChange={(e) =>
                    dispatch({ type: 'set-background', color: e.target.value })
                  }
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono uppercase focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => dispatch({ type: 'set-background', color: c })}
                    className="w-5 h-5 rounded border border-white/10 transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Element is selected
  const isLocked = selectedElement.locked;

  const handleUpdate = (patch: Partial<typeof selectedElement>) => {
    dispatch({
      type: 'replace-element',
      element: { ...selectedElement, ...patch } as typeof selectedElement,
    });
  };

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedElement.kind !== 'image') return;

    const res = await assetRepo.upload(file);
    if (res.ok) {
      handleUpdate({ assetId: res.value.id } as Partial<ImageElement>);
    } else {
      alert(`Upload failed: ${res.error.kind}`);
    }
    e.target.value = '';
  };

  return (
    <aside className="w-72 border-l border-zinc-800/80 bg-zinc-950 p-4 flex flex-col gap-5 overflow-y-auto shrink-0 z-10 text-xs">
      {/* Header & Quick Action Buttons */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[11px]">
          {selectedElement.kind} Properties
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleUpdate({ locked: !isLocked })}
            title={isLocked ? 'Unlock element' : 'Lock element'}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
          >
            {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={duplicateSelected}
            title="Duplicate (Ctrl+D)"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={deleteSelected}
            title="Delete (Backspace)"
            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Geometry / Transform */}
      <div>
        <label className="text-[11px] font-medium text-zinc-400 block mb-2">Transform</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">X</span>
            <input
              type="number"
              value={selectedElement.x}
              onChange={(e) => handleUpdate({ x: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">Y</span>
            <input
              type="number"
              value={selectedElement.y}
              onChange={(e) => handleUpdate({ y: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">Width</span>
            <input
              type="number"
              min={10}
              value={selectedElement.width}
              onChange={(e) =>
                handleUpdate({ width: Math.max(10, parseInt(e.target.value, 10) || 10) })
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">Height</span>
            <input
              type="number"
              min={10}
              value={selectedElement.height}
              onChange={(e) =>
                handleUpdate({ height: Math.max(10, parseInt(e.target.value, 10) || 10) })
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Opacity & Rotation */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
              Opacity ({Math.round(selectedElement.opacity * 100)}%)
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={selectedElement.opacity}
              onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">Rotation (°)</span>
            <input
              type="number"
              value={selectedElement.rotation}
              onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Layer Stacking Order */}
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 mb-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>Layer Order</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              dispatch({
                type: 'reorder-element',
                id: selectedElement.id,
                position: 'front',
              })
            }
            title="Bring to Front"
            className="p-1 h-7 text-xs"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              dispatch({
                type: 'reorder-element',
                id: selectedElement.id,
                position: 'forward',
              })
            }
            title="Bring Forward"
            className="p-1 h-7 text-xs"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              dispatch({
                type: 'reorder-element',
                id: selectedElement.id,
                position: 'back',
              })
            }
            title="Send Backward"
            className="p-1 h-7 text-xs"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              dispatch({
                type: 'reorder-element',
                id: selectedElement.id,
                position: 'to-back',
              })
            }
            title="Send to Back"
            className="p-1 h-7 text-xs"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* TEXT SPECIFIC PROPERTIES */}
      {selectedElement.kind === 'text' && (
        <div className="space-y-3 border-t border-zinc-800/80 pt-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Content
            </label>
            <textarea
              rows={3}
              value={selectedElement.text}
              onChange={(e) => handleUpdate({ text: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 outline-none focus:border-indigo-500 resize-y"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Font Family
            </label>
            <select
              value={selectedElement.fontFamily}
              onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 outline-none focus:border-indigo-500"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Playfair Display">Playfair Display (Serif)</option>
              <option value="JetBrains Mono">JetBrains Mono (Monospace)</option>
              <option value="system-ui">System UI</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">Font Size</span>
              <input
                type="number"
                min={8}
                max={200}
                value={selectedElement.fontSize}
                onChange={(e) =>
                  handleUpdate({ fontSize: Math.max(8, parseInt(e.target.value, 10) || 8) })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">Weight</span>
              <select
                value={selectedElement.fontWeight}
                onChange={(e) =>
                  handleUpdate({ fontWeight: parseInt(e.target.value, 10) || 400 })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 outline-none focus:border-indigo-500"
              >
                <option value={400}>Regular (400)</option>
                <option value={600}>Semi-bold (600)</option>
                <option value={700}>Bold (700)</option>
                <option value={800}>Extra-bold (800)</option>
              </select>
            </div>
          </div>

          {/* Color & Alignment */}
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">Text Color</label>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="color"
                value={selectedElement.color}
                onChange={(e) => handleUpdate({ color: e.target.value })}
                className="w-7 h-7 rounded border border-zinc-800 bg-transparent p-0 cursor-pointer"
              />
              <input
                type="text"
                value={selectedElement.color}
                onChange={(e) => handleUpdate({ color: e.target.value })}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono uppercase"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleUpdate({ color: c })}
                  className="w-4 h-4 rounded border border-white/10 hover:scale-110"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">Alignment</label>
            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
              <button
                onClick={() => handleUpdate({ textAlign: 'left' })}
                className={`py-1 flex items-center justify-center rounded cursor-pointer ${
                  selectedElement.textAlign === 'left' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleUpdate({ textAlign: 'center' })}
                className={`py-1 flex items-center justify-center rounded cursor-pointer ${
                  selectedElement.textAlign === 'center' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleUpdate({ textAlign: 'right' })}
                className={`py-1 flex items-center justify-center rounded cursor-pointer ${
                  selectedElement.textAlign === 'right' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHAPE SPECIFIC PROPERTIES */}
      {selectedElement.kind === 'shape' && (
        <div className="space-y-3 border-t border-zinc-800/80 pt-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">Fill Color</label>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="color"
                value={selectedElement.fill}
                onChange={(e) => handleUpdate({ fill: e.target.value })}
                className="w-7 h-7 rounded border border-zinc-800 bg-transparent p-0 cursor-pointer"
              />
              <input
                type="text"
                value={selectedElement.fill}
                onChange={(e) => handleUpdate({ fill: e.target.value })}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono uppercase"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleUpdate({ fill: c })}
                  className="w-4 h-4 rounded border border-white/10 hover:scale-110"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Stroke */}
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">Stroke</label>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="color"
                value={selectedElement.stroke || '#000000'}
                onChange={(e) => handleUpdate({ stroke: e.target.value })}
                className="w-7 h-7 rounded border border-zinc-800 bg-transparent p-0 cursor-pointer"
              />
              <input
                type="number"
                min={0}
                max={30}
                placeholder="Width"
                value={selectedElement.strokeWidth || 0}
                onChange={(e) =>
                  handleUpdate({ strokeWidth: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
                className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
              />
            </div>
          </div>

          {/* Corner radius for rectangles */}
          {selectedElement.shape === 'rectangle' && (
            <div>
              <span className="text-[11px] font-medium text-zinc-400 block mb-1">
                Corner Radius ({selectedElement.cornerRadius || 0}px)
              </span>
              <input
                type="range"
                min={0}
                max={120}
                value={selectedElement.cornerRadius || 0}
                onChange={(e) =>
                  handleUpdate({ cornerRadius: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* IMAGE SPECIFIC PROPERTIES */}
      {selectedElement.kind === 'image' && (
        <div className="space-y-3 border-t border-zinc-800/80 pt-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-2">
              Replace Image
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => replaceFileInputRef.current?.click()}
              className="w-full gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload New Image
            </Button>
            <input
              ref={replaceFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleReplaceImage}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 mb-2">
              <Crop className="w-3.5 h-3.5" />
              <span>Image Crop (0..1 Range)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-500 block mb-0.5">Crop X</span>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={0.9}
                  value={selectedElement.crop.x}
                  onChange={(e) =>
                    handleUpdate({
                      crop: { ...selectedElement.crop, x: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block mb-0.5">Crop Y</span>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={0.9}
                  value={selectedElement.crop.y}
                  onChange={(e) =>
                    handleUpdate({
                      crop: { ...selectedElement.crop, y: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block mb-0.5">Crop Width</span>
                <input
                  type="number"
                  step={0.05}
                  min={0.1}
                  max={1}
                  value={selectedElement.crop.width}
                  onChange={(e) =>
                    handleUpdate({
                      crop: {
                        ...selectedElement.crop,
                        width: Math.min(1, Math.max(0.1, parseFloat(e.target.value) || 1)),
                      },
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block mb-0.5">Crop Height</span>
                <input
                  type="number"
                  step={0.05}
                  min={0.1}
                  max={1}
                  value={selectedElement.crop.height}
                  onChange={(e) =>
                    handleUpdate({
                      crop: {
                        ...selectedElement.crop,
                        height: Math.min(1, Math.max(0.1, parseFloat(e.target.value) || 1)),
                      },
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
