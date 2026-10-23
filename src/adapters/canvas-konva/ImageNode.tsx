import React, { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type { ImageElement } from '@/domain/design';
import type { AssetRepository } from '@/domain/ports';

interface ImageNodeProps {
  element: ImageElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updated: ImageElement) => void;
  assetRepo: AssetRepository;
  shapeRef: (node: Konva.Image | null) => void;
}

export const ImageNode: React.FC<ImageNodeProps> = ({
  element,
  isSelected: _isSelected,
  onSelect,
  onChange,
  assetRepo,
  shapeRef,
}) => {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    assetRepo.getUrl(element.assetId).then((res) => {
      if (!active) return;
      if (!res.ok) {
        setHasError(true);
        return;
      }
      objectUrl = res.value;
      const img = new Image();
      img.onload = () => {
        if (!active) return;
        setImageObj(img);
        setHasError(false);
      };
      img.onerror = () => {
        if (!active) return;
        setHasError(true);
      };
      img.src = objectUrl;
    });

    return () => {
      active = false;
    };
  }, [element.assetId, assetRepo]);

  if (hasError || !imageObj) {
    // Fallback placeholder when loading or error
    return null;
  }

  const naturalW = imageObj.naturalWidth || element.width;
  const naturalH = imageObj.naturalHeight || element.height;

  const cropConfig = {
    x: element.crop.x * naturalW,
    y: element.crop.y * naturalH,
    width: element.crop.width * naturalW,
    height: element.crop.height * naturalH,
  };

  return (
    <KonvaImage
      ref={shapeRef}
      id={element.id}
      image={imageObj}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      crop={cropConfig}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          ...element,
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        onChange({
          ...element,
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(10, Math.round(node.width() * scaleX)),
          height: Math.max(10, Math.round(node.height() * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    />
  );
};
