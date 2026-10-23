import React from 'react';
import { Rect as KonvaRect, Ellipse as KonvaEllipse } from 'react-konva';
import type Konva from 'konva';
import type { ShapeElement } from '@/domain/design';

interface ShapeNodeProps {
  element: ShapeElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onChange: (updated: ShapeElement) => void;
  shapeRef: (node: Konva.Shape | null) => void;
}

export const ShapeNode: React.FC<ShapeNodeProps> = ({
  element,
  isSelected: _isSelected,
  onSelect,
  onChange,
  shapeRef,
}) => {
  if (element.shape === 'rectangle') {
    return (
      <KonvaRect
        ref={shapeRef}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        opacity={element.opacity}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        cornerRadius={element.cornerRadius}
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
  }

  // Ellipse: x, y is top-left in document space, Konva expects center
  return (
    <KonvaEllipse
      ref={shapeRef}
      id={element.id}
      x={element.x + element.width / 2}
      y={element.y + element.height / 2}
      radiusX={element.width / 2}
      radiusY={element.height / 2}
      rotation={element.rotation}
      opacity={element.opacity}
      fill={element.fill}
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          ...element,
          x: Math.round(e.target.x() - element.width / 2),
          y: Math.round(e.target.y() - element.height / 2),
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        const newWidth = Math.max(10, Math.round(element.width * scaleX));
        const newHeight = Math.max(10, Math.round(element.height * scaleY));

        onChange({
          ...element,
          x: Math.round(node.x() - newWidth / 2),
          y: Math.round(node.y() - newHeight / 2),
          width: newWidth,
          height: newHeight,
          rotation: Math.round(node.rotation()),
        });
      }}
    />
  );
};
