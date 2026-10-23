import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Link as LinkIcon, Trash2, Globe } from 'lucide-react';
import type { DesignDocument } from '@/domain/design';
import type { LocalShareRepository, ShareRecord } from '@/adapters/persistence/share-repository';
import { Button } from '@/ui/Button';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DesignDocument;
  shareRepo: LocalShareRepository;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  document,
  shareRepo,
}) => {
  const [activeShare, setActiveShare] = useState<ShareRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      shareRepo.getShareByDesignId(document.id).then((res) => {
        setIsLoading(false);
        if (res.ok) setActiveShare(res.value);
      });
    }
  }, [isOpen, document.id, shareRepo]);

  if (!isOpen) return null;

  const shareUrl = activeShare
    ? `${window.location.origin}${window.location.pathname}?share=${activeShare.token}`
    : '';

  const handleCreateShare = async () => {
    setIsLoading(true);
    const res = await shareRepo.createShare(document);
    setIsLoading(false);
    if (res.ok) {
      setActiveShare(res.value);
    }
  };

  const handleRevokeShare = async () => {
    if (!activeShare) return;
    if (confirm('Revoke this share link? Anyone with the link will no longer be able to view it.')) {
      setIsLoading(true);
      await shareRepo.revokeShare(activeShare.token);
      setActiveShare(null);
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Share Read-Only Link</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Anyone with this link can view this design and export it as PNG, but cannot make any edits.
        </p>

        {activeShare ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded-xl">
              <LinkIcon className="w-4 h-4 text-zinc-500 shrink-0 ml-1" />
              <input
                readOnly
                data-testid="share-url-input"
                value={shareUrl}
                className="w-full bg-transparent text-xs text-zinc-200 outline-none font-mono truncate"
              />
              <Button variant="secondary" size="sm" onClick={handleCopy} className="shrink-0 gap-1">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-[11px] text-zinc-500">
                Created {new Date(activeShare.createdAt).toLocaleDateString()}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRevokeShare}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revoke Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center">
              <p className="text-xs text-zinc-400 mb-3">
                No active share link. Generate one to share a read-only preview.
              </p>
              <Button
                variant="primary"
                size="md"
                data-testid="create-share-btn"
                onClick={handleCreateShare}
                disabled={isLoading}
                className="w-full"
              >
                Create Public Share Link
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
