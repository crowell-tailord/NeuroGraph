import React, { useEffect, useRef } from 'react';
import { Route, Check, Unlink } from 'lucide-react';
import { LineType } from '../../types/mindmap';
import { cn } from '../../lib/utils';

interface PathContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  parentId: string | null;
  childId: string | null;
  currentLineType: LineType;
  onClose: () => void;
  onSelectLineType: (parentId: string, childId: string, lineType: LineType) => void;
  onSeverConnection?: (parentId: string, childId: string) => void;
}

const LINE_OPTIONS: Array<{
  id: LineType;
  label: string;
  renderVisual: (isActive: boolean) => React.ReactNode;
}> = [
  {
    id: 'solid',
    label: 'Single',
    renderVisual: (isActive) => (
      <svg className="w-10 h-3" viewBox="0 0 40 12">
        <line
          x1="2"
          y1="6"
          x2="38"
          y2="6"
          stroke={isActive ? '#67e8f9' : '#94a3b8'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'double',
    label: 'Double',
    renderVisual: (isActive) => (
      <svg className="w-10 h-3" viewBox="0 0 40 12">
        <line
          x1="2"
          y1="3"
          x2="38"
          y2="3"
          stroke={isActive ? '#67e8f9' : '#94a3b8'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="9"
          x2="38"
          y2="9"
          stroke={isActive ? '#67e8f9' : '#94a3b8'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'dotted',
    label: 'Dotted',
    renderVisual: (isActive) => (
      <svg className="w-10 h-3" viewBox="0 0 40 12">
        <line
          x1="2"
          y1="6"
          x2="38"
          y2="6"
          stroke={isActive ? '#67e8f9' : '#94a3b8'}
          strokeWidth="2"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export const PathContextMenu: React.FC<PathContextMenuProps> = ({
  isOpen,
  x,
  y,
  parentId,
  childId,
  currentLineType,
  onClose,
  onSelectLineType,
  onSeverConnection,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !parentId || !childId) return null;

  // Clamp menu position to stay completely inside viewport bounds
  const menuWidth = 190;
  const menuHeight = 175;
  const safeX = Math.min(Math.max(x, 10), window.innerWidth - menuWidth - 10);
  const safeY = Math.min(Math.max(y, 10), window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${safeX}px`,
        top: `${safeY}px`,
        zIndex: 100,
      }}
      className={cn(
        'w-[190px] p-1.5 rounded bg-[#0d0f16]/95 border border-white/10 shadow-2xl backdrop-blur-xl',
        'font-mono text-xs text-slate-200 select-none animate-in fade-in-50 zoom-in-95'
      )}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-2 py-1 text-[9px] uppercase tracking-widest text-slate-500 border-b border-white/[0.07] mb-1.5 font-semibold flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Route className="w-3 h-3 text-cyan-400" />
          <span>PATH OPTIONS</span>
        </div>
      </div>

      {/* Line Options: Single, Double, Dotted */}
      <div className="space-y-1">
        {LINE_OPTIONS.map((opt) => {
          const isActive = currentLineType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onSelectLineType(parentId, childId, opt.id);
                onClose();
              }}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-all border text-left',
                isActive
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/15'
              )}
            >
              <div className="flex items-center gap-2">
                <span>{opt.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[2.5]" />}
              </div>
              <div>{opt.renderVisual(isActive)}</div>
            </button>
          );
        })}
      </div>

      {/* Sever Connection Action */}
      {onSeverConnection && (
        <div className="pt-1.5 mt-1.5 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => {
              onSeverConnection(parentId, childId);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer outline-none hover:bg-rose-500/20 hover:text-rose-300 text-rose-400/90 transition-colors text-left group"
          >
            <Unlink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium">Sever Path</span>
          </button>
        </div>
      )}
    </div>
  );
};
