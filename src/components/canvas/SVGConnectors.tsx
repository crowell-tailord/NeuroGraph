import React from 'react';
import { MindMapNode, NodeColor } from '../../types/mindmap';

interface SVGConnectorsProps {
  nodes: MindMapNode[];
  selectedNodeId: string | null;
}

const COLOR_MAP: Record<NodeColor, { stroke: string; glow: string; dot: string }> = {
  red: { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', dot: '#f43f5e' },
  cyan: { stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)', dot: '#06b6d4' },
  amber: { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', dot: '#f59e0b' },
  emerald: { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', dot: '#10b981' },
  purple: { stroke: '#a855f7', glow: 'rgba(168, 85, 247, 0.45)', dot: '#a855f7' },
  slate: { stroke: '#64748b', glow: 'rgba(100, 116, 139, 0.35)', dot: '#94a3b8' },
};

export const SVGConnectors: React.FC<SVGConnectorsProps> = ({ nodes, selectedNodeId }) => {
  const nodeMap = React.useMemo(() => {
    const map = new Map<string, MindMapNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Generate dynamic 4-directional connector paths
  const connections = React.useMemo(() => {
    const items: Array<{
      id: string;
      path: string;
      color: NodeColor;
      isSelected: boolean;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }> = [];

    nodes.forEach((child) => {
      if (!child.parentId) return;
      const parent = nodeMap.get(child.parentId);
      if (!parent) return;

      const pW = parent.width || 200;
      const pH = parent.height || 70;
      const cW = child.width || 200;
      const cH = child.height || 70;

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
          const cpOffset = Math.max(Math.abs(dy) * 0.5, 25);
          path = `M ${startX} ${startY} C ${startX} ${startY + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`;
        } else {
          // Child is above parent
          startX = parentCenterX;
          startY = parent.y;
          endX = childCenterX;
          endY = child.y + cH;
          const cpOffset = Math.max(Math.abs(dy) * 0.5, 25);
          path = `M ${startX} ${startY} C ${startX} ${startY - cpOffset}, ${endX} ${endY + cpOffset}, ${endX} ${endY}`;
        }
      } else {
        // Horizontal connection
        if (dx >= 0) {
          // Child is to the right of parent
          startX = parent.x + pW;
          startY = parentCenterY;
          endX = child.x;
          endY = childCenterY;
          const cpOffset = Math.max(Math.abs(dx) * 0.5, 25);
          path = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;
        } else {
          // Child is to the left of parent
          startX = parent.x;
          startY = parentCenterY;
          endX = child.x + cW;
          endY = childCenterY;
          const cpOffset = Math.max(Math.abs(dx) * 0.5, 25);
          path = `M ${startX} ${startY} C ${startX - cpOffset} ${startY}, ${endX + cpOffset} ${endY}, ${endX} ${endY}`;
        }
      }

      const isSelected = selectedNodeId === child.id || selectedNodeId === parent.id;

      items.push({
        id: `${parent.id}->${child.id}`,
        path,
        color: child.color || parent.color || 'red',
        isSelected,
        startX,
        startY,
        endX,
        endY,
      });
    });

    return items;
  }, [nodes, nodeMap, selectedNodeId]);

  return (
    <svg
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
          <g key={c.id}>
            {/* Background halo glow line */}
            <path
              d={c.path}
              fill="none"
              stroke={theme.glow}
              strokeWidth={c.isSelected ? 4 : 2}
              strokeLinecap="round"
              className="transition-all duration-75"
            />

            {/* Main tactical sharp vector line */}
            <path
              d={c.path}
              fill="none"
              stroke={theme.stroke}
              strokeWidth={c.isSelected ? 2 : 1.5}
              strokeOpacity={c.isSelected ? 1 : 0.8}
              strokeDasharray={c.isSelected ? '4 2' : undefined}
              strokeLinecap="round"
              className="transition-all duration-75"
            />

            {/* Parent origin terminal dot */}
            <circle
              cx={c.startX}
              cy={c.startY}
              r={2.5}
              fill={theme.dot}
              stroke="#08090c"
              strokeWidth={1}
            />

            {/* Child destination terminal reticle */}
            <circle
              cx={c.endX}
              cy={c.endY}
              r={3}
              fill="#08090c"
              stroke={theme.dot}
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
};
