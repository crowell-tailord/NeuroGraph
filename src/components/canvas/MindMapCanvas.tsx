import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Target } from 'lucide-react';
import {
  MindMapNode,
  NodeColor,
  NodeTextColor,
  NodeShape,
  NodeDirection,
  TextAlign,
  ViewportState,
} from '../../types/mindmap';
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
  onTextColorChange: (id: string, textColor: NodeTextColor) => void;
  onDetachNode: (id: string) => void;
  onAttachNodes: (sourceId: string, targetId: string) => void;
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
  onTextColorChange,
  onDetachNode,
  onAttachNodes,
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

  // Connecting drag state: dragging from a plus button to attach to another node
  const [dragConnect, setDragConnect] = useState<{
    sourceNodeId: string;
    dir: NodeDirection;
    startClientPos: { x: number; y: number };
    currentClientPos: { x: number; y: number };
    isDragging: boolean;
    targetNodeId: string | null;
    isTargetInvalid: boolean;
  } | null>(null);

  const dragConnectRef = useRef(dragConnect);
  dragConnectRef.current = dragConnect;

  // Track global pointer events while dragging a connection from a plus button
  useEffect(() => {
    if (!dragConnect) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const state = dragConnectRef.current;
      if (!state) return;

      const dist = Math.hypot(
        e.clientX - state.startClientPos.x,
        e.clientY - state.startClientPos.y
      );
      const isDragging = state.isDragging || dist > 5;

      const canvasX = (e.clientX - viewport.panX) / viewport.zoom;
      const canvasY = (e.clientY - viewport.panY) / viewport.zoom;

      // Find node under cursor
      const hoveredNode = nodes.find((n) => {
        if (n.id === state.sourceNodeId) return false;
        const nw = n.width || (n.shape === 'circle' ? 140 : 200);
        const nh = n.height || (n.shape === 'circle' ? 140 : 70);
        return (
          canvasX >= n.x - 15 &&
          canvasX <= n.x + nw + 15 &&
          canvasY >= n.y - 15 &&
          canvasY <= n.y + nh + 15
        );
      });

      let isTargetInvalid = false;
      if (hoveredNode) {
        // Cycle check: cannot attach if target is already downstream of source
        let curr: MindMapNode | undefined = hoveredNode;
        const visited = new Set<string>();
        while (curr && curr.parentId) {
          if (curr.parentId === state.sourceNodeId) {
            isTargetInvalid = true;
            break;
          }
          if (visited.has(curr.parentId)) break;
          visited.add(curr.parentId);
          curr = nodes.find((n) => n.id === curr!.parentId);
        }
      }

      setDragConnect({
        ...state,
        currentClientPos: { x: e.clientX, y: e.clientY },
        isDragging,
        targetNodeId: hoveredNode?.id || null,
        isTargetInvalid,
      });
    };

    const handleWindowPointerUp = () => {
      const state = dragConnectRef.current;
      if (!state) return;

      if (!state.isDragging) {
        // Pure click without dragging -> spawn child in that direction
        onAddChild(state.sourceNodeId, state.dir);
      } else if (state.targetNodeId && !state.isTargetInvalid) {
        // Dragged and released over a valid target node -> attach!
        onAttachNodes(state.sourceNodeId, state.targetNodeId);
      }

      setDragConnect(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [dragConnect?.sourceNodeId, nodes, onAddChild, onAttachNodes, viewport.panX, viewport.panY, viewport.zoom]);

  // Compute live active SVG connection line during drag
  const dragConnectionData = useMemo(() => {
    if (!dragConnect || !dragConnect.isDragging) return null;
    const source = nodes.find((n) => n.id === dragConnect.sourceNodeId);
    if (!source) return null;

    const sW = source.width || (source.shape === 'circle' ? 140 : 200);
    const sH = source.height || (source.shape === 'circle' ? 140 : 70);
    let startX = source.x + sW / 2;
    let startY = source.y + sH / 2;
    switch (dragConnect.dir) {
      case 'top':
        startY = source.y;
        break;
      case 'bottom':
        startY = source.y + sH;
        break;
      case 'left':
        startX = source.x;
        break;
      case 'right':
        startX = source.x + sW;
        break;
    }

    let endX: number;
    let endY: number;

    if (dragConnect.targetNodeId && !dragConnect.isTargetInvalid) {
      const target = nodes.find((n) => n.id === dragConnect.targetNodeId);
      if (target) {
        const tW = target.width || (target.shape === 'circle' ? 140 : 200);
        const tH = target.height || (target.shape === 'circle' ? 140 : 70);
        endX = target.x + tW / 2;
        endY = target.y + tH / 2;
      } else {
        endX = (dragConnect.currentClientPos.x - viewport.panX) / viewport.zoom;
        endY = (dragConnect.currentClientPos.y - viewport.panY) / viewport.zoom;
      }
    } else {
      endX = (dragConnect.currentClientPos.x - viewport.panX) / viewport.zoom;
      endY = (dragConnect.currentClientPos.y - viewport.panY) / viewport.zoom;
    }

    const dx = endX - startX;
    const dy = endY - startY;
    const cpOffset = Math.max(Math.hypot(dx, dy) * 0.4, 30);
    let cp1X = startX;
    let cp1Y = startY;
    if (dragConnect.dir === 'top') cp1Y -= cpOffset;
    else if (dragConnect.dir === 'bottom') cp1Y += cpOffset;
    else if (dragConnect.dir === 'left') cp1X -= cpOffset;
    else cp1X += cpOffset;

    const path = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${endX - dx * 0.2} ${endY - dy * 0.2}, ${endX} ${endY}`;

    return {
      path,
      startX,
      startY,
      endX,
      endY,
      isTargetActive: Boolean(dragConnect.targetNodeId && !dragConnect.isTargetInvalid),
      isTargetInvalid: dragConnect.isTargetInvalid,
    };
  }, [dragConnect, nodes, viewport.panX, viewport.panY, viewport.zoom]);

  const handleStartConnect = (
    sourceNodeId: string,
    dir: NodeDirection,
    clientX: number,
    clientY: number
  ) => {
    setDragConnect({
      sourceNodeId,
      dir,
      startClientPos: { x: clientX, y: clientY },
      currentClientPos: { x: clientX, y: clientY },
      isDragging: false,
      targetNodeId: null,
      isTargetInvalid: false,
    });
  };

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
        <SVGConnectors
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onDetachNode={onDetachNode}
          dragConnection={dragConnectionData}
        />

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
            onStartConnect={handleStartConnect}
            isConnectTarget={dragConnect?.targetNodeId === node.id && !dragConnect.isTargetInvalid}
            isConnectInvalid={dragConnect?.targetNodeId === node.id && dragConnect.isTargetInvalid}
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
        onTextColorChange={onTextColorChange}
        onDetachNode={onDetachNode}
      />
    </div>
  );
};
