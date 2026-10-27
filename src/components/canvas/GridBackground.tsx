import React from 'react';
import { ViewportState } from '../../types/mindmap';

interface GridBackgroundProps {
  viewport: ViewportState;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({ viewport }) => {
  const baseSize = 40;
  const scaledSize = baseSize * viewport.zoom;

  // Grid offsets modulo scaledSize
  const offsetX = (viewport.panX % scaledSize + scaledSize) % scaledSize;
  const offsetY = (viewport.panY % scaledSize + scaledSize) % scaledSize;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        backgroundColor: '#08090c',
      }}
    >
      {/* SVG Pattern Grid */}
      <svg className="w-full h-full opacity-40">
        <defs>
          <pattern
            id="tactical-grid-pattern"
            width={scaledSize}
            height={scaledSize}
            patternUnits="userSpaceOnUse"
            x={offsetX}
            y={offsetY}
          >
            {/* Fine hairline grid lines */}
            <line
              x1="0"
              y1="0"
              x2={scaledSize}
              y2="0"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={scaledSize}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />

            {/* Micro intersection dots */}
            <circle cx="0" cy="0" r="1" fill="rgba(255, 255, 255, 0.15)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tactical-grid-pattern)" />
      </svg>

      {/* Subtle telemetry corner watermark */}
      <div className="absolute top-4 left-4 pointer-events-none font-mono text-[10px] tracking-widest text-slate-700 select-none">
        GRID: 40px // SCALE: {(viewport.zoom * 100).toFixed(0)}%
      </div>
    </div>
  );
};
