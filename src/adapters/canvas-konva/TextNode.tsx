import React from 'react';
import { Text as KonvaText } from 'react-konva';
import type Konva from 'konva';
import type { TextElement } from '@/domain/design';

interface TextNodeProps {
  element: TextElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDblClick: () => void;
  onChange: (updated: TextElement) => void;
  shapeRef: (node: Konva.Text | null) => void;
}

export const TextNode: React.FC<TextNodeProps> = ({
  element,
  isSelected: _isSelected,
  onSelect,
  onDblClick,
  onChange,
  shapeRef,
}) => {
  return (
    <KonvaText
      ref={shapeRef}
      id={element.id}
      text={element.text}
      x={element.x}
      y={element.y}
      width={element.width}
      fontFamily={element.fontFamily}
      fontSize={element.fontSize}
      fontStyle={element.fontWeight >= 700 ? 'bold' : 'normal'}
      fill={element.color}
      align={element.textAlign}
      lineHeight={element.lineHeight}
      rotation={element.rotation}
      opacity={element.opacity}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
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
          width: Math.max(20, Math.round(node.width() * scaleX)),
          fontSize: Math.max(8, Math.round(element.fontSize * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    />
  );
};
