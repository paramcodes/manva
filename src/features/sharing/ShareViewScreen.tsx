import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { Download, AlertCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import type { DesignDocument } from '@/domain/design';
import type { LocalShareRepository } from '@/adapters/persistence/share-repository';
import type { AssetRepository, DesignRenderer } from '@/domain/ports';
import { TextNode, ShapeNode, ImageNode } from '@/adapters/canvas-konva';
import { Button } from '@/ui/Button';

interface ShareViewScreenProps {
  token: string;
  shareRepo: LocalShareRepository;
  assetRepo: AssetRepository;
  renderer: DesignRenderer;
  onGoHome: () => void;
}

export const ShareViewScreen: React.FC<ShareViewScreenProps> = ({
  token,
  shareRepo,
  assetRepo,
  renderer,
  onGoHome,
}) => {
  const [document, setDocument] = useState<DesignDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    shareRepo.getShare(token).then((res) => {
      setIsLoading(false);
      if (res.ok) {
        setDocument(res.value.documentSnapshot);
      } else {
        if (res.error.kind === 'revoked') {
          setError('This share link has been revoked by the author.');
        } else {
          setError('Design not found or the link has expired.');
        }
      }
    });
  }, [token, shareRepo]);

  const handleExportPng = async () => {
    if (!document) return;
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
        alert('Export failed: ' + res.error.kind);
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span>Loading shared graphic...</span>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Link Unavailable</h2>
          <p className="text-sm text-zinc-400">{error || 'Unable to open design'}</p>
          <Button variant="secondary" size="md" onClick={onGoHome} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go to Manva Studio
          </Button>
        </div>
      </div>
    );
  }

  // Calculate scaling to fit in window with margin
  const availW = window.innerWidth - 80;
  const availH = window.innerHeight - 140;
  const scale = Math.min(availW / document.canvas.width, availH / document.canvas.height, 1);
  const stageW = document.canvas.width * scale;
  const stageH = document.canvas.height * scale;

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
            M
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm text-zinc-100">{document.title}</h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              Read-Only
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onGoHome} className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Create Your Own
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPng}
            disabled={isExporting}
            className="gap-1.5"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PNG
          </Button>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <main className="flex-1 flex items-center justify-center p-6 bg-zinc-950 overflow-auto">
        <div
          className="relative rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          style={{ width: stageW, height: stageH }}
        >
          <Stage
            width={stageW}
            height={stageH}
            scaleX={scale}
            scaleY={scale}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={document.canvas.width}
                height={document.canvas.height}
                fill={document.canvas.background}
              />
              {document.elements.map((el) => {
                const noop = () => {};
                if (el.kind === 'text') {
                  return (
                    <TextNode
                      key={el.id}
                      element={{ ...el, locked: true }}
                      isSelected={false}
                      onSelect={noop}
                      onDblClick={noop}
                      onChange={noop}
                      shapeRef={noop}
                    />
                  );
                }
                if (el.kind === 'shape') {
                  return (
                    <ShapeNode
                      key={el.id}
                      element={{ ...el, locked: true }}
                      isSelected={false}
                      onSelect={noop}
                      onChange={noop}
                      shapeRef={noop}
                    />
                  );
                }
                if (el.kind === 'image') {
                  return (
                    <ImageNode
                      key={el.id}
                      element={{ ...el, locked: true }}
                      isSelected={false}
                      onSelect={noop}
                      onChange={noop}
                      assetRepo={assetRepo}
                      shapeRef={noop}
                    />
                  );
                }
                return null;
              })}
            </Layer>
          </Stage>
        </div>
      </main>
    </div>
  );
};
