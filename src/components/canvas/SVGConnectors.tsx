import React from 'react';
import { MindMapNode, NodeColor, LineType, LineRouting, getNodeParentIds } from '../../types/mindmap';

export interface DragConnectionData {
  path: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isTargetActive: boolean;
  isTargetInvalid: boolean;
}

interface SVGConnectorsProps {
  nodes: MindMapNode[];
  selectedNodeId: string | null;
  lineRouting?: LineRouting;
  onDetachNode?: (nodeId: string) => void;
  onDetachConnection?: (parentId: string, childId: string) => void;
  onOpenContextMenu?: (nodeId: string, x: number, y: number) => void;
  onOpenPathMenu?: (parentId: string, childId: string, x: number, y: number, currentLineType: LineType) => void;
  dragConnection?: DragConnectionData | null;
}

const COLOR_MAP: Record<NodeColor, { stroke: string; glow: string; dot: string }> = {
  red: { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', dot: '#f43f5e' },
  cyan: { stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)', dot: '#06b6d4' },
  amber: { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', dot: '#f59e0b' },
  emerald: { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', dot: '#10b981' },
  purple: { stroke: '#a855f7', glow: 'rgba(168, 85, 247, 0.45)', dot: '#a855f7' },
  slate: { stroke: '#64748b', glow: 'rgba(100, 116, 139, 0.35)', dot: '#94a3b8' },
};

export const SVGConnectors: React.FC<SVGConnectorsProps> = ({
  nodes,
  selectedNodeId,
  lineRouting = 'curved',
  onDetachNode,
  onDetachConnection,
  onOpenContextMenu,
  onOpenPathMenu,
  dragConnection,
}) => {
  const nodeMap = React.useMemo(() => {
    const map = new Map<string, MindMapNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Generate dynamic connector paths (supports unlimited multiple connections)
  const connections = React.useMemo(() => {
    const items: Array<{
      id: string;
      parentId: string;
      childId: string;
      path: string;
      color: NodeColor;
      lineType: LineType;
      isSelected: boolean;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      midX: number;
      midY: number;
    }> = [];

    const processedPairs = new Set<string>();

    nodes.forEach((child) => {
      const parentIds = getNodeParentIds(child);
      parentIds.forEach((parentId) => {
        const parent = nodeMap.get(parentId);
        if (!parent) return;

        // Prevent duplicate lines between the same pair of nodes
        const pairKey = [parent.id, child.id].sort().join(':::');
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);

        const pW = parent.width || (parent.shape === 'circle' ? 140 : 200);
        const pH = parent.height || (parent.shape === 'circle' ? 140 : 70);
        const cW = child.width || (child.shape === 'circle' ? 140 : 200);
        const cH = child.height || (child.shape === 'circle' ? 140 : 70);

        const parentCenterX = parent.x + pW / 2;
        const parentCenterY = parent.y + pH / 2;
        const childCenterX = child.x + cW / 2;
        const childCenterY = child.y + cH / 2;

        const dx = childCenterX - parentCenterX;
        const dy = childCenterY - parentCenterY;

        let startX: number;
        let startY: number;
        let endX: number;
        let endY: number;
        let path: string;

        // Decide if primary relationship is vertical or horizontal
        if (Math.abs(dy) >= Math.abs(dx)) {
          // Vertical connection
          if (dy >= 0) {
            // Child is below parent
            startX = parentCenterX;
            startY = parent.y + pH;
            endX = childCenterX;
            endY = child.y;
          } else {
            // Child is above parent
            startX = parentCenterX;
            startY = parent.y;
            endX = childCenterX;
            endY = child.y + cH;
          }

          if (lineRouting === 'hard') {
            const midY = Math.round(startY + (endY - startY) / 2);
            path = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
          } else {
            const cpOffset = Math.max(Math.abs(dy) * 0.5, 25);
            if (dy >= 0) {
              path = `M ${startX} ${startY} C ${startX} ${startY + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`;
            } else {
              path = `M ${startX} ${startY} C ${startX} ${startY - cpOffset}, ${endX} ${endY + cpOffset}, ${endX} ${endY}`;
            }
          }
        } else {
          // Horizontal connection
          if (dx >= 0) {
            // Child is to the right of parent
            startX = parent.x + pW;
            startY = parentCenterY;
            endX = child.x;
            endY = childCenterY;
          } else {
            // Child is to the left of parent
            startX = parent.x;
            startY = parentCenterY;
            endX = child.x + cW;
            endY = childCenterY;
          }

          if (lineRouting === 'hard') {
            const midX = Math.round(startX + (endX - startX) / 2);
            path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
          } else {
            const cpOffset = Math.max(Math.abs(dx) * 0.5, 25);
            if (dx >= 0) {
              path = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;
            } else {
              path = `M ${startX} ${startY} C ${startX - cpOffset} ${startY}, ${endX + cpOffset} ${endY}, ${endX} ${endY}`;
            }
          }
        }

        const isSelected = selectedNodeId === child.id || selectedNodeId === parent.id;
        const lineType: LineType =
          child.connectionLineTypes?.[parentId] ||
          parent.connectionLineTypes?.[child.id] ||
          child.lineType ||
          parent.lineType ||
          'solid';

        items.push({
          id: `${parent.id}->${child.id}`,
          parentId: parent.id,
          childId: child.id,
          path,
          color: child.color || parent.color || 'red',
          lineType,
          isSelected,
          startX,
          startY,
          endX,
          endY,
          midX: Math.round((startX + endX) / 2),
          midY: Math.round((startY + endY) / 2),
        });
      });
    });

    return items;
  }, [nodes, nodeMap, selectedNodeId, lineRouting]);

  return (
    <svg
      id="mindmap-svg-connectors"
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 0 }}
    >
      <defs>
        <filter id="tactical-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {connections.map((c) => {
        const theme = COLOR_MAP[c.color] || COLOR_MAP.red;

        return (
          <g
            key={c.id}
            className="group/connector"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Background halo glow line (omitted for dotted lines so only dashes show with zero background color) */}
            {c.lineType !== 'dotted' && (
              <path
                d={c.path}
                fill="none"
                stroke={theme.glow}
                strokeWidth={
                  c.lineType === 'double'
                    ? c.isSelected ? 13 : 11
                    : c.isSelected ? 4 : 2
                }
                strokeLinecap="round"
                className="connector-glow-line transition-[stroke,stroke-width] duration-75"
              />
            )}

            {/* Main tactical sharp vector line (turns red marching ants on hover to delete) */}
            <path
              d={c.path}
              fill="none"
              stroke={theme.stroke}
              strokeWidth={
                c.lineType === 'double'
                  ? c.isSelected ? 9.5 : 8
                  : c.lineType === 'dotted'
                  ? c.isSelected ? 2.5 : 2
                  : c.isSelected ? 2 : 1.5
              }
              strokeOpacity={c.isSelected ? 1 : 0.85}
              strokeDasharray={
                c.lineType === 'dotted'
                  ? '2 5'
                  : c.isSelected ? '4 2' : undefined
              }
              strokeLinecap="round"
              className="connector-tactical-line transition-[stroke,stroke-width,stroke-opacity] duration-75"
            />

            {/* Double line center gap */}
            {c.lineType === 'double' && (
              <path
                d={c.path}
                fill="none"
                stroke="#08090c"
                strokeWidth={c.isSelected ? 5.5 : 5}
                strokeLinecap="round"
                className="connector-tactical-line-inner pointer-events-none transition-opacity duration-75"
              />
            )}

            {/* Wide transparent hover target line with real SVG pointer-events */}
            <path
              d={c.path}
              fill="none"
              stroke="transparent"
              strokeWidth={32}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onOpenPathMenu) {
                  onOpenPathMenu(c.parentId, c.childId, e.clientX, e.clientY, c.lineType);
                } else if (onOpenContextMenu) {
                  onOpenContextMenu(c.childId, e.clientX, e.clientY);
                }
              }}
            />

            {/* Parent origin terminal dot */}
            <circle
              cx={c.startX}
              cy={c.startY}
              r={c.lineType === 'double' ? 3.5 : 2.5}
              fill={theme.dot}
              stroke="#08090c"
              strokeWidth={1}
              className="connector-terminal-dot transition-colors duration-75"
            />

            {/* Child destination terminal reticle */}
            <circle
              cx={c.endX}
              cy={c.endY}
              r={c.lineType === 'double' ? 4 : 3}
              fill="#08090c"
              stroke={theme.dot}
              strokeWidth={1.5}
              className="connector-terminal-reticle transition-colors duration-75"
            />

            {/* Interactive Detach / Sever button at curve midpoint on hover */}
            {(onDetachConnection || onDetachNode) && (
              <g
                role="button"
                data-interactive="true"
                transform={`translate(${c.midX}, ${c.midY})`}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                className="opacity-0 group-hover/connector:opacity-100 transition-opacity duration-150 group/sever"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDetachConnection) {
                    onDetachConnection(c.parentId, c.childId);
                  } else if (onDetachNode) {
                    onDetachNode(c.childId);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onOpenPathMenu) {
                    onOpenPathMenu(c.parentId, c.childId, e.clientX, e.clientY, c.lineType);
                  }
                }}
              >
                {/* Generous transparent hit area to prevent hover flicker */}
                <circle cx={0} cy={0} r={18} fill="transparent" style={{ pointerEvents: 'all' }} />

                {/* Subtle outer glow ring on hover */}
                <circle
                  cx={0}
                  cy={0}
                  r={13}
                  fill="none"
                  stroke="rgba(244, 63, 94, 0.5)"
                  strokeWidth={1}
                  className="opacity-0 group-hover/sever:opacity-100 transition-opacity duration-150"
                />

                {/* Button background circle */}
                <circle
                  cx={0}
                  cy={0}
                  r={10}
                  fill="#0e111a"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  className="transition-all duration-150 group-hover/sever:fill-[#201016] group-hover/sever:stroke-rose-500 group-hover/sever:stroke-[2]"
                />

                {/* Sever 'X' lines */}
                <line
                  x1={-3.5}
                  y1={-3.5}
                  x2={3.5}
                  y2={3.5}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  className="transition-all duration-150 group-hover/sever:stroke-rose-400 group-hover/sever:stroke-[2]"
                />
                <line
                  x1={3.5}
                  y1={-3.5}
                  x2={-3.5}
                  y2={3.5}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  className="transition-all duration-150 group-hover/sever:stroke-rose-400 group-hover/sever:stroke-[2]"
                />
                <title>Sever connection (Click) • Path options (Right-click)</title>
              </g>
            )}
          </g>
        );
      })}

      {/* Live Active Dragging Connection */}
      {dragConnection && (
        <g className="pointer-events-none">
          {/* Outer glow */}
          <path
            d={dragConnection.path}
            fill="none"
            stroke={
              dragConnection.isTargetInvalid
                ? 'rgba(244, 63, 94, 0.5)'
                : dragConnection.isTargetActive
                ? 'rgba(6, 182, 212, 0.55)'
                : 'rgba(56, 189, 248, 0.4)'
            }
            strokeWidth={5}
            strokeLinecap="round"
          />

          {/* Animated tactical dash line */}
          <path
            d={dragConnection.path}
            fill="none"
            stroke={
              dragConnection.isTargetInvalid
                ? '#f43f5e'
                : dragConnection.isTargetActive
                ? '#06b6d4'
                : '#38bdf8'
            }
            strokeWidth={2.5}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />

          {/* Source node terminal dot */}
          <circle
            cx={dragConnection.startX}
            cy={dragConnection.startY}
            r={3.5}
            fill={dragConnection.isTargetInvalid ? '#f43f5e' : '#06b6d4'}
            stroke="#08090c"
            strokeWidth={1.5}
          />

          {/* End cursor/target reticle */}
          <circle
            cx={dragConnection.endX}
            cy={dragConnection.endY}
            r={dragConnection.isTargetActive ? 8 : 5}
            fill="none"
            stroke={
              dragConnection.isTargetInvalid
                ? '#f43f5e'
                : dragConnection.isTargetActive
                ? '#06b6d4'
                : '#38bdf8'
            }
            strokeWidth={2}
          />
          <circle
            cx={dragConnection.endX}
            cy={dragConnection.endY}
            r={2}
            fill={
              dragConnection.isTargetInvalid
                ? '#f43f5e'
                : dragConnection.isTargetActive
                ? '#06b6d4'
                : '#38bdf8'
            }
          />
        </g>
      )}
    </svg>
  );
};
