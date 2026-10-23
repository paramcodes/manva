import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { DesignElement, TextElement, ElementId } from '@/domain/design';
import { useEditorStore } from '@/domain/editor';
import { TextNode } from './TextNode';
import { ShapeNode } from './ShapeNode';
import { ImageNode } from './ImageNode';
import type { AssetRepository } from '@/domain/ports';

interface CanvasViewProps {
  assetRepo: AssetRepository;
}

export const CanvasView: React.FC<CanvasViewProps> = ({ assetRepo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeNodesRef = useRef<Map<string, Konva.Node>>(new Map());

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [editingTextId, setEditingTextId] = useState<ElementId | null>(null);
  const [editTextVal, setEditTextVal] = useState('');

  const {
    document,
    selectedIds,
    zoom,
    pan,
    setZoom,
    setPan,
    setSelection,
    clearSelection,
    dispatch,
  } = useEditorStore();

  // ResizeObserver for container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: Math.round(entry.contentRect.width),
            height: Math.round(entry.contentRect.height),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Zoom-to-fit calculation
  const zoomToFit = useCallback(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;
    const padding = 48;
    const availW = Math.max(containerSize.width - padding * 2, 100);
    const availH = Math.max(containerSize.height - padding * 2, 100);
    const scaleX = availW / document.canvas.width;
    const scaleY = availH / document.canvas.height;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 1.5);

    // Center canvas in container
    const centerX = (containerSize.width - document.canvas.width * newZoom) / 2;
    const centerY = (containerSize.height - document.canvas.height * newZoom) / 2;

    setZoom(newZoom);
    setPan({ x: centerX, y: centerY });
  }, [containerSize.width, containerSize.height, document.canvas.width, document.canvas.height, setZoom, setPan]);

  // Fit on document change or container resize
  useEffect(() => {
    zoomToFit();
  }, [document.id, containerSize.width, containerSize.height, zoomToFit]);

  // Attach transformer to selected nodes
  useEffect(() => {
    if (!transformerRef.current) return;
    const nodes: Konva.Node[] = [];
    for (const id of selectedIds) {
      const node = shapeNodesRef.current.get(id);
      if (node) nodes.push(node);
    }
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds, document.elements]);

  // Handle stage click (deselect when clicking background)
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If clicked empty area or canvas background
    if (e.target === e.target.getStage() || e.target.name() === 'canvas-background') {
      clearSelection();
      setEditingTextId(null);
    }
  };

  // Zoom via wheel
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = zoom;
    const pointer = stage.getPointerPosition() || {
      x: containerSize.width / 2,
      y: containerSize.height / 2,
    };

    const mousePointTo = {
      x: (pointer.x - pan.x) / oldScale,
      y: (pointer.y - pan.y) / oldScale,
    };

    const scaleBy = 1.08;
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.min(Math.max(newScale, 0.1), 4);

    const newPan = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setZoom(clampedScale);
    setPan(newPan);
  };

  const handleElementChange = (updated: DesignElement) => {
    dispatch({ type: 'replace-element', element: updated });
  };

  const handleStartEditText = (el: TextElement) => {
    setEditingTextId(el.id);
    setEditTextVal(el.text);
  };

  const handleFinishEditText = () => {
    if (!editingTextId) return;
    const el = document.elements.find((e) => e.id === editingTextId) as TextElement | undefined;
    if (el && editTextVal !== el.text) {
      dispatch({ type: 'replace-element', element: { ...el, text: editTextVal } });
    }
    setEditingTextId(null);
  };

  const activeEditingElement = editingTextId
    ? (document.elements.find((e) => e.id === editingTextId) as TextElement | undefined)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center select-none"
      tabIndex={0}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        draggable={false}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
      >
        <Layer>
          {/* Canvas drop-shadow and border indicator */}
          <Rect
            x={-2}
            y={-2}
            width={document.canvas.width + 4}
            height={document.canvas.height + 4}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={1}
            shadowColor="black"
            shadowBlur={30}
            shadowOpacity={0.6}
            shadowOffset={{ x: 0, y: 10 }}
            listening={false}
          />

          {/* Canvas Background */}
          <Rect
            name="canvas-background"
            x={0}
            y={0}
            width={document.canvas.width}
            height={document.canvas.height}
            fill={document.canvas.background}
          />

          {/* Render Elements */}
          {document.elements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const registerRef = (node: Konva.Node | null) => {
              if (node) {
                shapeNodesRef.current.set(el.id, node);
              } else {
                shapeNodesRef.current.delete(el.id);
              }
            };

            const onSelect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
              e.cancelBubble = true;
              if (e.evt.shiftKey) {
                // Multi-select
                if (isSelected) {
                  setSelection(selectedIds.filter((id) => id !== el.id));
                } else {
                  setSelection([...selectedIds, el.id]);
                }
              } else {
                setSelection([el.id]);
              }
            };

            if (el.kind === 'text') {
              return (
                <TextNode
                  key={el.id}
                  element={el}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  onDblClick={() => handleStartEditText(el)}
                  onChange={handleElementChange}
                  shapeRef={registerRef}
                />
              );
            }

            if (el.kind === 'shape') {
              return (
                <ShapeNode
                  key={el.id}
                  element={el}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  onChange={handleElementChange}
                  shapeRef={registerRef}
                />
              );
            }

            if (el.kind === 'image') {
              return (
                <ImageNode
                  key={el.id}
                  element={el}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  onChange={handleElementChange}
                  assetRepo={assetRepo}
                  shapeRef={registerRef}
                />
              );
            }

            return null;
          })}

          {/* Selection Transformer */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Minimum size constraint
              if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                return oldBox;
              }
              return newBox;
            }}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center',
            ]}
            anchorSize={9}
            anchorCornerRadius={2}
            anchorFill="#6366f1"
            anchorStroke="#ffffff"
            anchorStrokeWidth={1.5}
            borderStroke="#6366f1"
            borderStrokeWidth={1.5}
            rotateAnchorOffset={24}
          />
        </Layer>
      </Stage>

      {/* Floating text edit overlay when double-clicking text */}
      {activeEditingElement && (
        <textarea
          autoFocus
          className="absolute z-30 p-1 bg-zinc-900 text-white rounded border border-indigo-500 shadow-xl resize-none outline-none"
          style={{
            left: pan.x + activeEditingElement.x * zoom,
            top: pan.y + activeEditingElement.y * zoom,
            width: Math.max(activeEditingElement.width * zoom, 160),
            fontSize: `${activeEditingElement.fontSize * zoom}px`,
            fontFamily: activeEditingElement.fontFamily,
            color: activeEditingElement.color,
            lineHeight: activeEditingElement.lineHeight,
            textAlign: activeEditingElement.textAlign,
          }}
          value={editTextVal}
          onChange={(e) => setEditTextVal(e.target.value)}
          onBlur={handleFinishEditText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditingTextId(null);
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleFinishEditText();
            }
          }}
        />
      )}

      {/* Bottom Floating Viewport Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 shadow-lg text-xs text-zinc-300">
        <button
          onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
          className="hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-800"
          title="Zoom out"
        >
          -
        </button>
        <span className="w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(Math.min(4, zoom + 0.1))}
          className="hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-800"
          title="Zoom in"
        >
          +
        </button>
        <div className="w-px h-3 bg-zinc-700 mx-1" />
        <button
          onClick={zoomToFit}
          className="hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 font-medium"
        >
          Fit
        </button>
      </div>
    </div>
  );
};
