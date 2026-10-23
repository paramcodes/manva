import React, { useEffect, useRef } from 'react';
import { useEditorStore } from '@/domain/editor';
import { useEditorKeyboardShortcuts } from './KeyboardShortcuts';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { CanvasView } from '@/adapters/canvas-konva';
import { PropertyPanel } from './PropertyPanel';
import type { DesignRepository, AssetRepository, DesignRenderer } from '@/domain/ports';

interface EditorScreenProps {
  onBack: () => void;
  designRepo: DesignRepository;
  assetRepo: AssetRepository;
  renderer: DesignRenderer;
  onOpenShare?: () => void;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({
  onBack,
  designRepo,
  assetRepo,
  renderer,
  onOpenShare,
}) => {
  useEditorKeyboardShortcuts();

  const { document, saveStatus, setSaveStatus } = useEditorStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced Autosave (800ms)
  useEffect(() => {
    if (saveStatus !== 'saving') return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const res = await designRepo.save(document);
      if (res.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [document, saveStatus, designRepo, setSaveStatus]);

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <Toolbar onBack={onBack} renderer={renderer} onOpenShare={onOpenShare} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar assetRepo={assetRepo} />
        <main className="flex-1 relative overflow-hidden bg-zinc-950">
          <CanvasView assetRepo={assetRepo} />
        </main>
        <PropertyPanel assetRepo={assetRepo} />
      </div>
    </div>
  );
};
