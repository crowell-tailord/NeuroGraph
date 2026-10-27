import React, { useEffect, useRef } from 'react';
import { Plus, Trash2, Copy, ChevronRight, Shapes, Square, Circle, Palette, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { MindMapNode, NodeColor, NodeShape, TextAlign } from '../../types/mindmap';
import { cn } from '../../lib/utils';

interface TacticalContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  node: MindMapNode | null;
  onClose: () => void;
  onAddChild: (id: string, direction?: 'bottom') => void;
  onAddSibling: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: NodeColor) => void;
  onShapeChange: (id: string, shape: NodeShape) => void;
  onTextAlignChange: (id: string, align: TextAlign) => void;
}

const COLOR_DOTS: Record<NodeColor, string> = {
  red: 'bg-rose-500',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-400',
};

export const TacticalContextMenu: React.FC<TacticalContextMenuProps> = ({
  isOpen,
  x,
  y,
  node,
  onClose,
  onAddChild,
  onAddSibling,
  onDuplicate,
  onDelete,
  onColorChange,
  onShapeChange,
  onTextAlignChange,
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

  if (!isOpen || !node) return null;

  // Clamp menu position to stay completely inside viewport bounds
  const menuWidth = 205;
  const menuHeight = 340;
  const safeX = Math.min(Math.max(x, 10), window.innerWidth - menuWidth - 10);
  const safeY = Math.min(Math.max(y, 10), window.innerHeight - menuHeight - 10);

  const shape = node.shape || 'square';
  const textAlign = node.textAlign || (node.shape === 'circle' ? 'center' : 'left');

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
        'w-[205px] p-1.5 rounded bg-[#0d0f16]/95 border border-white/10 shadow-2xl backdrop-blur-xl',
        'font-mono text-xs text-slate-200 select-none animate-in fade-in-50 zoom-in-95'
      )}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[9px] uppercase tracking-widest text-slate-500 border-b border-white/[0.07] mb-1 font-semibold flex items-center justify-between">
        <span>NODE OPTIONS</span>
        <span className="text-slate-600 font-normal">#{node.id.slice(-4)}</span>
      </div>

      {/* Add Child */}
      <button
        type="button"
        onClick={() => {
          onAddChild(node.id, 'bottom');
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer outline-none hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-left"
      >
        <Plus className="w-3.5 h-3.5 text-rose-400" />
        <span>Add Child Below</span>
      </button>

      {/* Add Sibling */}
      <button
        type="button"
        onClick={() => {
          onAddSibling(node.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer outline-none hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors text-left"
      >
        <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
        <span>Add Sibling Node</span>
      </button>

      {/* Duplicate */}
      <button
        type="button"
        onClick={() => {
          onDuplicate(node.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer outline-none hover:bg-white/10 transition-colors text-left"
      >
        <Copy className="w-3.5 h-3.5 text-slate-400" />
        <span>Duplicate Node</span>
      </button>

      {/* Direct Shape Selector */}
      <div className="px-2 py-1.5 border-t border-white/[0.06] my-1">
        <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5 font-semibold flex items-center gap-1.5">
          <Shapes className="w-3 h-3 text-amber-400" />
          <span>Node Shape</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              onShapeChange(node.id, 'square');
            }}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1 px-2 rounded text-[11px] font-mono cursor-pointer transition-all border',
              shape === 'square'
                ? 'bg-rose-500/25 border-rose-500/60 text-rose-300 font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
          >
            <Square className="w-3 h-3" />
            <span>Square</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onShapeChange(node.id, 'circle');
            }}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1 px-2 rounded text-[11px] font-mono cursor-pointer transition-all border',
              shape === 'circle'
                ? 'bg-cyan-500/25 border-cyan-500/60 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
          >
            <Circle className="w-3 h-3" />
            <span>Circle</span>
          </button>
        </div>
      </div>

      {/* Align Text Selector */}
      <div className="px-2 py-1.5 border-t border-white/[0.06] my-1">
        <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5 font-semibold flex items-center gap-1.5">
          <AlignLeft className="w-3 h-3 text-rose-400" />
          <span>Align Text</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => onTextAlignChange(node.id, 'left')}
            className={cn(
              'flex items-center justify-center gap-1 py-1 px-1 rounded text-[10px] font-mono cursor-pointer transition-all border',
              textAlign === 'left'
                ? 'bg-rose-500/25 border-rose-500/60 text-rose-300 font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
          >
            <AlignLeft className="w-3 h-3" />
            <span>Left</span>
          </button>
          <button
            type="button"
            title={shape === 'circle' ? 'Center (Vertically & Horizontally)' : 'Center'}
            onClick={() => onTextAlignChange(node.id, 'center')}
            className={cn(
              'flex items-center justify-center gap-1 py-1 px-1 rounded text-[10px] font-mono cursor-pointer transition-all border',
              textAlign === 'center'
                ? 'bg-rose-500/25 border-rose-500/60 text-rose-300 font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
          >
            <AlignCenter className="w-3 h-3" />
            <span>Center</span>
          </button>
          <button
            type="button"
            onClick={() => onTextAlignChange(node.id, 'right')}
            className={cn(
              'flex items-center justify-center gap-1 py-1 px-1 rounded text-[10px] font-mono cursor-pointer transition-all border',
              textAlign === 'right'
                ? 'bg-rose-500/25 border-rose-500/60 text-rose-300 font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
          >
            <AlignRight className="w-3 h-3" />
            <span>Right</span>
          </button>
        </div>
      </div>

      {/* Direct Color Palette */}
      <div className="px-2 py-1.5 border-t border-white/[0.06] my-1">
        <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5 font-semibold flex items-center gap-1.5">
          <Palette className="w-3 h-3 text-cyan-400" />
          <span>Color Accent</span>
        </div>
        <div className="flex items-center justify-between gap-1 px-0.5">
          {(['red', 'cyan', 'amber', 'emerald', 'purple', 'slate'] as NodeColor[]).map((c) => {
            const isCurrent = node.color === c;
            return (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => {
                  onColorChange(node.id, c);
                }}
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-125',
                  isCurrent ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                )}
              >
                <span className={cn('w-3.5 h-3.5 rounded-full shadow-inner', COLOR_DOTS[c])} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-white/[0.08] my-1" />

      {/* Delete Thought */}
      <button
        type="button"
        onClick={() => {
          onDelete(node.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer outline-none text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-left"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete Thought</span>
      </button>
    </div>
  );
};
