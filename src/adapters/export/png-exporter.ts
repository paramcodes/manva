import Konva from 'konva';
import type { DesignDocument, Result } from '@/domain/design';
import type { DesignRenderer, ExportError, AssetRepository } from '@/domain/ports';

export class KonvaDesignRenderer implements DesignRenderer {
  private assetRepo: AssetRepository;

  constructor(assetRepo: AssetRepository) {
    this.assetRepo = assetRepo;
  }

  async renderPng(document: DesignDocument, scale: number = 1): Promise<Result<Blob, ExportError>> {
    try {
      // 1. Wait for document fonts if in browser
      if (typeof window !== 'undefined' && document && 'fonts' in window.document) {
        await window.document.fonts.ready;
      }

      // 2. Create offscreen container
      const container = window.document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-99999px';
      container.style.top = '-99999px';
      window.document.body.appendChild(container);

      const stage = new Konva.Stage({
        container,
        width: document.canvas.width,
        height: document.canvas.height,
      });

      const layer = new Konva.Layer();
      stage.add(layer);

      // Background rect
      const bg = new Konva.Rect({
        x: 0,
        y: 0,
        width: document.canvas.width,
        height: document.canvas.height,
        fill: document.canvas.background,
      });
      layer.add(bg);

      // Render elements in stacking order
      for (const el of document.elements) {
        if (el.kind === 'shape') {
          if (el.shape === 'rectangle') {
            const rect = new Konva.Rect({
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation,
              opacity: el.opacity,
              fill: el.fill,
              stroke: el.stroke,
              strokeWidth: el.strokeWidth,
              cornerRadius: el.cornerRadius,
            });
            layer.add(rect);
          } else if (el.shape === 'ellipse') {
            const ellipse = new Konva.Ellipse({
              x: el.x + el.width / 2,
              y: el.y + el.height / 2,
              radiusX: el.width / 2,
              radiusY: el.height / 2,
              rotation: el.rotation,
              opacity: el.opacity,
              fill: el.fill,
              stroke: el.stroke,
              strokeWidth: el.strokeWidth,
            });
            layer.add(ellipse);
          }
        } else if (el.kind === 'text') {
          const text = new Konva.Text({
            x: el.x,
            y: el.y,
            width: el.width,
            text: el.text,
            fontFamily: el.fontFamily,
            fontSize: el.fontSize,
            fontStyle: el.fontWeight >= 700 ? 'bold' : 'normal',
            fill: el.color,
            align: el.textAlign,
            lineHeight: el.lineHeight,
            rotation: el.rotation,
            opacity: el.opacity,
          });
          layer.add(text);
        } else if (el.kind === 'image') {
          const urlRes = await this.assetRepo.getUrl(el.assetId);
          if (!urlRes.ok) {
            stage.destroy();
            container.remove();
            return { ok: false, error: { kind: 'asset-unavailable', id: el.assetId } };
          }

          const img = await this.loadImage(urlRes.value);
          const naturalW = img.naturalWidth || el.width;
          const naturalH = img.naturalHeight || el.height;

          const konvaImg = new Konva.Image({
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            image: img,
            crop: {
              x: el.crop.x * naturalW,
              y: el.crop.y * naturalH,
              width: el.crop.width * naturalW,
              height: el.crop.height * naturalH,
            },
            rotation: el.rotation,
            opacity: el.opacity,
          });
          layer.add(konvaImg);
        }
      }

      layer.draw();

      const blob = await new Promise<Blob | null>((resolve) => {
        stage.toBlob({
          pixelRatio: scale,
          mimeType: 'image/png',
          callback: (b) => resolve(b),
        });
      });

      // Cleanup DOM
      stage.destroy();
      container.remove();

      if (!blob) {
        return { ok: false, error: { kind: 'render-failure', message: 'Failed to create image blob' } };
      }

      return { ok: true, value: blob };
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          kind: 'render-failure',
          message: err instanceof Error ? err.message : 'Unknown render error',
        },
      };
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image asset: ' + src));
      img.src = src;
    });
  }
}
