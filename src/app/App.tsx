import React, { useState, useMemo } from 'react';
import type { DesignDocument } from '@/domain/design';
import { useEditorStore } from '@/domain/editor';
import { IndexedDbDesignRepository } from '@/adapters/persistence/indexeddb-design-repository';
import { IndexedDbAssetRepository } from '@/adapters/asset-storage/indexeddb-asset-repository';
import { KonvaDesignRenderer } from '@/adapters/export/png-exporter';
import { LocalShareRepository } from '@/adapters/persistence/share-repository';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { EditorScreen } from '@/features/editor/EditorScreen';
import { ShareModal } from '@/features/sharing/ShareModal';
import { ShareViewScreen } from '@/features/sharing/ShareViewScreen';

type Screen = 'dashboard' | 'editor';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Read share token from URL if present (?share=token or #share=token)
  const shareToken = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('share');
    if (token) return token;

    if (window.location.hash.startsWith('#/share/')) {
      return window.location.hash.replace('#/share/', '');
    }
    return null;
  }, []);

  // Adapters created at composition root
  const designRepo = useMemo(() => new IndexedDbDesignRepository(), []);
  const assetRepo = useMemo(() => new IndexedDbAssetRepository(), []);
  const renderer = useMemo(() => new KonvaDesignRenderer(assetRepo), [assetRepo]);
  const shareRepo = useMemo(() => new LocalShareRepository(), []);

  const { document, setDocument } = useEditorStore();

  const handleOpenDesign = (doc: DesignDocument) => {
    setDocument(doc, true);
    setScreen('editor');
  };

  const handleBackToDashboard = () => {
    setScreen('dashboard');
  };

  const handleGoHome = () => {
    // Clear ?share= from URL and go to dashboard
    window.history.pushState({}, '', window.location.pathname);
    window.location.reload();
  };

  // If viewing a shared link
  if (shareToken) {
    return (
      <ShareViewScreen
        token={shareToken}
        shareRepo={shareRepo}
        assetRepo={assetRepo}
        renderer={renderer}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <>
      {screen === 'dashboard' ? (
        <DashboardScreen
          designRepo={designRepo}
          onOpenDesign={handleOpenDesign}
        />
      ) : (
        <EditorScreen
          onBack={handleBackToDashboard}
          designRepo={designRepo}
          assetRepo={assetRepo}
          renderer={renderer}
          onOpenShare={() => setIsShareModalOpen(true)}
        />
      )}

      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          document={document}
          shareRepo={shareRepo}
        />
      )}
    </>
  );
};
