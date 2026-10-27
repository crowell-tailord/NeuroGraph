import React, { useState, useMemo } from 'react';
import { Plus, Target } from 'lucide-react';
import { MindMapNode, NodeColor, NodeShape, NodeDirection, TextAlign, ViewportState } from '../../types/mindmap';
import { GridBackground } from './GridBackground';
import { SVGConnectors } from './SVGConnectors';
import { MindMapNodeComponent } from '../node/MindMapNodeComponent';
import { TacticalContextMenu } from './TacticalContextMenu';

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  viewport: ViewportState;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onTextChange: (id: string, text: string) => void;
  onAddChild: (id: string, direction?: NodeDirection) => void;
  onAddSibling: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onColorChange: (id: string, color: NodeColor) => void;
  onShapeChange: (id: string, shape: NodeShape) => void;
  onTextAlignChange: (id: string, align: TextAlign) => void;
  onDimensionsChange: (id: string, width: number, height: number) => void;
  onAddRoot: () => void;
  onWheel: (e: React.WheelEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  nodes,
  viewport,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onTextChange,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  onDuplicateNode,
  onColorChange,
  onShapeChange,
  onTextAlignChange,
  onDimensionsChange,
  onAddRoot,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    nodeId: null,
  });

  const activeContextMenuNode = useMemo(() => {
    if (!contextMenu.nodeId) return null;
    return nodes.find((n) => n.id === contextMenu.nodeId) || null;
  }, [nodes, contextMenu.nodeId]);

  const handleOpenContextMenu = (nodeId: string, x: number, y: number) => {
    setContextMenu({
      isOpen: true,
      x,
      y,
      nodeId,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#08090c] touch-none select-none cursor-grab active:cursor-grabbing"
      onWheel={onWheel}
      onPointerDown={(e) => {
        handleCloseContextMenu();
        onPointerDown(e);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => {
        handleCloseContextMenu();
        onSelectNode(null);
      }}
    >
      {/* Tactical Coordinate Grid Background */}
      <GridBackground viewport={viewport} />

      {/* Center Empty State: Plus button to start first thought */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-4 p-8 rounded-lg bg-[#0e111a]/95 backdrop-blur-xl border border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)] pointer-events-auto select-none"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-rose-400 uppercase">
              <Target className="w-3.5 h-3.5" />
              <span>Canvas Ready</span>
            </div>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onAddRoot();
              }}
              className="group relative flex items-center gap-3 px-6 py-3.5 rounded-sm bg-rose-500/10 border border-rose-500/50 hover:bg-rose-500 hover:text-white text-rose-300 font-mono text-sm tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
            >
              {/* Corner brackets */}
              <div className="corner-bracket-tl text-rose-500 group-hover:text-white" />
              <div className="corner-bracket-tr text-rose-500 group-hover:text-white" />
              <div className="corner-bracket-bl text-rose-500 group-hover:text-white" />
              <div className="corner-bracket-br text-rose-500 group-hover:text-white" />

              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span className="font-bold">Initialize Central Thought</span>
            </button>

            <span className="font-mono text-[11px] text-slate-500">
              Click plus sign to place first node
            </span>
          </div>
        </div>
      )}

      {/* Interactive Mind Map Elements Container with Viewport Transform */}
      <div
        id="mindmap-canvas-container"
        style={{
          transform: `translate3d(${viewport.panX}px, ${viewport.panY}px, 0) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
        }}
      >
        {/* Dynamic SVG Curves Layer (tracks 4-directional anchors synchronously at 60fps) */}
        <SVGConnectors nodes={nodes} selectedNodeId={selectedNodeId} />

        {/* Thought Nodes Layer */}
        {nodes.map((node) => (
          <MindMapNodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            zoom={viewport.zoom}
            onSelect={onSelectNode}
            onMove={onMoveNode}
            onTextChange={onTextChange}
            onAddChild={onAddChild}
            onDelete={onDeleteNode}
            onOpenContextMenu={handleOpenContextMenu}
            onDimensionsChange={onDimensionsChange}
          />
        ))}
      </div>

      {/* Centralized Tactical Context Menu (instant 1-click execution, completely immune to unmount focus traps) */}
      <TacticalContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        node={activeContextMenuNode}
        onClose={handleCloseContextMenu}
        onAddChild={onAddChild}
        onAddSibling={onAddSibling}
        onDuplicate={onDuplicateNode}
        onDelete={onDeleteNode}
        onColorChange={onColorChange}
        onShapeChange={onShapeChange}
        onTextAlignChange={onTextAlignChange}
      />
    </div>
  );
};
