import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { marked } from 'marked';
import { MindMapNode, NodeColor, NodeTextColor, NodeDirection } from '../../types/mindmap';
import { cn } from '../../lib/utils';

interface MindMapNodeComponentProps {
  node: MindMapNode;
  isSelected: boolean;
  zoom: number;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onTextChange: (id: string, text: string) => void;
  onAddChild: (id: string, direction?: NodeDirection) => void;
  onDelete: (id: string) => void;
  onOpenContextMenu: (id: string, x: number, y: number) => void;
  onDimensionsChange?: (id: string, width: number, height: number) => void;
  onStartConnect?: (sourceNodeId: string, dir: NodeDirection, clientX: number, clientY: number) => void;
  isConnectTarget?: boolean;
  isConnectInvalid?: boolean;
  connectInvalidReason?: string;
}

const TEXT_COLOR_STYLE_MAP: Record<NodeTextColor, string> = {
  default: '#f1f5f9',
  red: '#fb7185',
  cyan: '#22d3ee',
  amber: '#fbbf24',
  emerald: '#34d399',
  purple: '#c084fc',
  slate: '#94a3b8',
};

const COLOR_CONFIG: Record<
  NodeColor,
  {
    border: string;
    bracket: string;
    glow: string;
    dot: string;
    btnHover: string;
  }
> = {
  red: {
    border: 'border-rose-500/50',
    bracket: 'text-rose-500',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.22)]',
    dot: 'bg-rose-500',
    btnHover: 'hover:bg-rose-500 hover:text-white hover:border-rose-400',
  },
  cyan: {
    border: 'border-cyan-500/50',
    bracket: 'text-cyan-500',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.22)]',
    dot: 'bg-cyan-500',
    btnHover: 'hover:bg-cyan-500 hover:text-white hover:border-cyan-400',
  },
  amber: {
    border: 'border-amber-500/50',
    bracket: 'text-amber-500',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.22)]',
    dot: 'bg-amber-500',
    btnHover: 'hover:bg-amber-500 hover:text-white hover:border-amber-400',
  },
  emerald: {
    border: 'border-emerald-500/50',
    bracket: 'text-emerald-500',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.22)]',
    dot: 'bg-emerald-500',
    btnHover: 'hover:bg-emerald-500 hover:text-white hover:border-emerald-400',
  },
  purple: {
    border: 'border-purple-500/50',
    bracket: 'text-purple-500',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.22)]',
    dot: 'bg-purple-500',
    btnHover: 'hover:bg-purple-500 hover:text-white hover:border-purple-400',
  },
  slate: {
    border: 'border-slate-500/50',
    bracket: 'text-slate-400',
    glow: 'shadow-[0_0_15px_rgba(148,163,184,0.18)]',
    dot: 'bg-slate-400',
    btnHover: 'hover:bg-slate-500 hover:text-white hover:border-slate-400',
  },
};

export const MindMapNodeComponent: React.FC<MindMapNodeComponentProps> = ({
  node,
  isSelected,
  zoom,
  onSelect,
  onMove,
  onTextChange,
  onAddChild,
  onDelete,
  onOpenContextMenu,
  onDimensionsChange,
  onStartConnect,
  isConnectTarget,
  isConnectInvalid,
  connectInvalidReason,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const isResizingRef = useRef(false);
  const hasResizedRef = useRef(false);
  const activeResizePointerIdRef = useRef<number | null>(null);
  const activeStopResizingRef = useRef<(() => void) | null>(null);

  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const startNodePosRef = useRef({ x: 0, y: 0 });
  const resizeStartPosRef = useRef({ x: 0, y: 0 });
  const resizeStartDimensionsRef = useRef({ width: 0, height: 0 });
  const lastGripClickRef = useRef<number>(0);
  const lastAutoFitRef = useRef<number>(0);

  // If node is brand new with empty text, start in editing mode
  const [isEditing, setIsEditing] = useState(node.text === '');

  const shape = node.shape || 'square';
  const theme = COLOR_CONFIG[node.color] || COLOR_CONFIG.red;
  const textAlign = node.textAlign || (shape === 'circle' ? 'center' : 'left');
  const alignClass = textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left';
  const textColorHex = TEXT_COLOR_STYLE_MAP[node.textColor || 'default'] || '#f1f5f9';

  // Markdown rendering
  const renderedMarkdown = useMemo(() => {
    if (!node.text.trim()) {
      return '<p class="text-slate-500 italic text-xs">Click to write thought...</p>';
    }
    try {
      return marked.parse(node.text, { async: false, breaks: true, gfm: true }) as string;
    } catch {
      return node.text;
    }
  }, [node.text]);

  // Focus textarea when entering editing mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
      if (shape === 'circle' && textAlign === 'center') {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(
          textareaRef.current.scrollHeight,
          (node.height || 140) - 32
        )}px`;
      }
    }
  }, [isEditing, shape, textAlign, node.height]);

  // Cleanup active resize on unmount
  useEffect(() => {
    return () => {
      if (activeStopResizingRef.current) {
        activeStopResizingRef.current();
      }
      isResizingRef.current = false;
      isDraggingRef.current = false;
    };
  }, []);

  // Pointer drag for moving node
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, textarea, input, [data-resize-handle="true"]')) {
      return;
    }
    if (e.button !== 0) return;

    // Safety: ensure resize flag is clear so dragging node never freezes
    isResizingRef.current = false;

    e.stopPropagation();
    onSelect(node.id);

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    startNodePosRef.current = { x: node.x, y: node.y };

    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isResizingRef.current) return;
    if (!isDraggingRef.current) return;
    if (e.buttons === 0) {
      isDraggingRef.current = false;
      return;
    }
    e.stopPropagation();

    const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
    if (dist > 3) {
      hasMovedRef.current = true;
    }

    const dx = (e.clientX - dragStartPosRef.current.x) / zoom;
    const dy = (e.clientY - dragStartPosRef.current.y) / zoom;

    onMove(node.id, Math.round(startNodePosRef.current.x + dx), Math.round(startNodePosRef.current.y + dy));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Click-and-drag resizing with global window listeners to guarantee clean release
  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    // If an existing resize session is somehow active, terminate it first
    if (activeStopResizingRef.current) {
      activeStopResizingRef.current();
    }

    isResizingRef.current = true;
    hasResizedRef.current = false;
    activeResizePointerIdRef.current = e.pointerId;

    resizeStartPosRef.current = { x: e.clientX, y: e.clientY };
    const initialCircleSize = Math.max(node.width || 140, node.height || 140, 140);
    resizeStartDimensionsRef.current = {
      width: shape === 'circle' ? initialCircleSize : (node.width || 200),
      height: shape === 'circle' ? initialCircleSize : (node.height || 70),
    };

    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const onWindowPointerMove = (ev: PointerEvent) => {
      if (!isResizingRef.current) return;
      // If mouse button was released anywhere, immediately stop resizing
      if (ev.buttons === 0) {
        stopResizing();
        return;
      }

      const dist = Math.hypot(ev.clientX - resizeStartPosRef.current.x, ev.clientY - resizeStartPosRef.current.y);
      if (dist > 3) {
        hasResizedRef.current = true;
      } else {
        return;
      }

      const dx = (ev.clientX - resizeStartPosRef.current.x) / zoom;
      const dy = (ev.clientY - resizeStartPosRef.current.y) / zoom;

      if (shape === 'circle') {
        // Diagonal projection: (dx + dy) / 2 provides smooth, symmetric scaling along both axes
        const delta = (dx + dy) / 2;
        const newSize = Math.max(60, Math.min(500, resizeStartDimensionsRef.current.width + delta));
        const rounded = Math.round(newSize);
        if (onDimensionsChange) {
          onDimensionsChange(node.id, rounded, rounded);
        }
      } else {
        const newWidth = Math.max(50, Math.min(650, resizeStartDimensionsRef.current.width + dx));
        const newHeight = Math.max(40, Math.min(500, resizeStartDimensionsRef.current.height + dy));

        if (onDimensionsChange) {
          onDimensionsChange(node.id, Math.round(newWidth), Math.round(newHeight));
        }
      }
    };

    const stopResizing = (ev?: Event) => {
      if (ev) {
        ev.stopPropagation();
      }
      isResizingRef.current = false;
      activeStopResizingRef.current = null;

      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
      window.removeEventListener('blur', stopResizing);

      if (activeResizePointerIdRef.current !== null) {
        try {
          target.releasePointerCapture(activeResizePointerIdRef.current);
        } catch {
          // ignore
        }
        activeResizePointerIdRef.current = null;
      }
    };

    activeStopResizingRef.current = stopResizing;
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);
    window.addEventListener('blur', stopResizing);
  };

  // Auto-compress box to tightly fit content with equal padding on all sides
  const handleAutoFit = () => {
    if (isEditing) {
      setIsEditing(false);
    }
    onSelect(node.id);

    // Determine HTML content to measure
    let htmlToMeasure = renderedMarkdown;
    if (isEditing && textareaRef.current) {
      const rawText = textareaRef.current.value;
      if (!rawText.trim()) {
        htmlToMeasure = '<p class="text-slate-500 italic text-xs">Click to write thought...</p>';
      } else {
        try {
          htmlToMeasure = marked.parse(rawText, { async: false, breaks: true, gfm: true }) as string;
        } catch {
          htmlToMeasure = rawText;
        }
      }
    }

    // Create an invisible off-screen measuring container
    const measurer = document.createElement('div');
    measurer.style.position = 'fixed';
    measurer.style.top = '-9999px';
    measurer.style.left = '-9999px';
    measurer.style.visibility = 'hidden';
    measurer.style.pointerEvents = 'none';
    measurer.style.display = 'inline-block';
    measurer.style.overflow = 'hidden';
    measurer.style.width = 'max-content';
    measurer.style.maxWidth = '550px';
    measurer.style.height = 'auto';
    measurer.style.padding = '0';
    measurer.style.margin = '0';
    measurer.style.border = 'none';
    measurer.style.boxSizing = 'border-box';
    measurer.style.lineHeight = '1.625';
    measurer.style.fontSize = '12px';

    if (containerRef.current) {
      const computed = window.getComputedStyle(containerRef.current);
      measurer.style.fontFamily = computed.fontFamily;
    }

    const inner = document.createElement('div');
    inner.className = cn(
      'font-mono text-xs leading-relaxed text-slate-100',
      'prose-invert prose-xs',
      '[&_p]:m-0 [&_ul]:pl-3.5 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:my-1 [&_h2]:text-xs [&_h2]:font-bold [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded',
      alignClass
    );
    inner.innerHTML = htmlToMeasure;
    measurer.appendChild(inner);

    document.body.appendChild(measurer);

    const rect = inner.getBoundingClientRect();
    const contentWidth = Math.ceil(rect.width);
    const contentHeight = Math.ceil(rect.height);

    document.body.removeChild(measurer);

    // Padding is 12px (p-3 in Tailwind) on each side, plus 1px border on each side = 26px total offset
    const PADDING_OFFSET = 26;

    if (shape === 'circle') {
      const diagonal = Math.hypot(contentWidth, contentHeight);
      const circlePadding = 24;
      const diameter = Math.max(80, Math.ceil(diagonal + circlePadding * 2));
      if (onDimensionsChange) {
        onDimensionsChange(node.id, diameter, diameter);
      }
    } else {
      const targetWidth = Math.max(50, contentWidth + PADDING_OFFSET);
      const targetHeight = Math.max(40, contentHeight + PADDING_OFFSET);

      if (onDimensionsChange) {
        onDimensionsChange(node.id, targetWidth, targetHeight);
      }
    }
  };

  const triggerAutoFit = () => {
    const now = Date.now();
    if (now - lastAutoFitRef.current < 250) return;
    lastAutoFitRef.current = now;
    handleAutoFit();
  };

  const handleGripClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If user just finished a drag-resize, ignore the trailing click event
    if (hasResizedRef.current) {
      hasResizedRef.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastGripClickRef.current < 350) {
      triggerAutoFit();
      lastGripClickRef.current = 0;
    } else {
      lastGripClickRef.current = now;
    }
  };

  // Directional button builder helper (supports Click to Add Child, Drag to Attach)
  const renderDirectionButton = (
    dir: NodeDirection,
    positionClass: string,
    label: string
  ) => (
    <button
      type="button"
      title={`Add thought ${label} (Click) • Attach to node (Drag)`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (onStartConnect) {
          onStartConnect(node.id, dir, e.clientX, e.clientY);
        } else {
          onAddChild(node.id, dir);
        }
      }}
      className={cn(
        'absolute z-30 cursor-pointer pointer-events-auto',
        positionClass,
        'w-6 h-6 rounded-full flex items-center justify-center',
        'bg-[#0d0f17] border border-white/20 text-slate-300 shadow-xl',
        'transition-all duration-200 transform hover:scale-125 active:scale-90',
        theme.btnHover,
        'opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto'
      )}
    >
      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
    </button>
  );

  return (
    <div
      ref={containerRef}
      id={`mindmap-node-${node.id}`}
      style={{
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: `${shape === 'circle' ? (node.width || node.height || 140) : (node.width || 200)}px`,
        height: `${shape === 'circle' ? (node.height || node.width || 140) : (node.height || 70)}px`,
        minHeight: `${shape === 'circle' ? (node.height || node.width || 140) : (node.height || 70)}px`,
        maxHeight: shape === 'circle' ? `${node.height || node.width || 140}px` : undefined,
        touchAction: 'none',
      }}
      className={cn(
        'absolute top-0 left-0 group select-none transition-[box-shadow] duration-150',
        'bg-[#0f1118]/95 backdrop-blur-md border',
        theme.border,
        isSelected && [theme.glow, 'ring-1 ring-white/40'],
        isConnectTarget && 'ring-2 ring-cyan-400 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] z-40',
        isConnectInvalid && 'ring-2 ring-rose-500/70 border-rose-500/70 opacity-60',
        shape === 'circle' && 'rounded-full aspect-square flex items-center justify-center',
        shape === 'square' && 'rounded-sm',
        'cursor-grab active:cursor-grabbing z-10'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(node.id);
        onOpenContextMenu(node.id, e.clientX, e.clientY);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
        if (!hasMovedRef.current) {
          setIsEditing(true);
        }
      }}
    >
      {/* Target Attachment HUD Indicator */}
      {isConnectTarget && !isConnectInvalid && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-cyan-500 text-black font-mono text-[9px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(6,182,212,0.8)] pointer-events-none animate-pulse whitespace-nowrap z-50">
          ATTACH TO NODE
        </div>
      )}
      {isConnectTarget && isConnectInvalid && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-rose-500 text-white font-mono text-[9px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(244,63,94,0.8)] pointer-events-none whitespace-nowrap z-50">
          {connectInvalidReason || 'ALREADY CONNECTED'}
        </div>
      )}
      {/* Tactical Corner Brackets (for square shape) */}
      {shape !== 'circle' && (
        <>
          <div className={cn('corner-bracket-tl', theme.bracket)} />
          <div className={cn('corner-bracket-tr', theme.bracket)} />
          <div className={cn('corner-bracket-bl', theme.bracket)} />
          <div className={cn('corner-bracket-br', theme.bracket)} />
        </>
      )}

      {/* Quick Delete Button on Hover (Top-Right) */}
      <button
        type="button"
        title="Delete this thought"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(node.id);
        }}
        className={cn(
          'absolute -top-3 -right-3 z-30 w-6 h-6 rounded-full',
          'bg-[#141724] border border-rose-500/50 text-rose-400 hover:text-white hover:bg-rose-600 hover:border-rose-500',
          'flex items-center justify-center shadow-xl',
          'opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer transform hover:scale-125 active:scale-90'
        )}
      >
        <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Quick Edit Indicator (Top-Left) */}
      {!isEditing && (
        <button
          type="button"
          title="Click to edit thought"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className={cn(
            'absolute -top-3 -left-3 z-30 w-6 h-6 rounded-full',
            'bg-[#141724] border border-cyan-500/50 text-cyan-400 hover:text-white hover:bg-cyan-600 hover:border-cyan-500',
            'flex items-center justify-center shadow-xl',
            'opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer transform hover:scale-125 active:scale-90'
          )}
        >
          <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}

      {/* Node Body Content */}
      <div
        style={
          {
            color: textColorHex,
            ['--tw-prose-body' as string]: textColorHex,
            ['--tw-prose-headings' as string]: textColorHex,
            ['--tw-prose-bold' as string]: textColorHex,
            ['--tw-prose-links' as string]: textColorHex,
          } as React.CSSProperties
        }
        className={cn(
          'w-full h-full font-mono text-xs leading-relaxed flex flex-col',
          shape === 'circle' ? 'p-4' : 'p-3',
          shape === 'circle' && textAlign === 'center'
            ? 'items-center justify-center text-center'
            : shape === 'circle' && textAlign === 'right'
            ? 'items-end justify-start text-right'
            : shape === 'circle' && textAlign === 'left'
            ? 'items-start justify-start text-left'
            : alignClass
        )}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={node.text}
            placeholder="Type thought (markdown supported)..."
            onChange={(e) => {
              onTextChange(node.id, e.target.value);
              if (shape === 'circle' && textAlign === 'center') {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(
                  e.target.scrollHeight,
                  (node.height || 140) - 32
                )}px`;
              }
            }}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsEditing(false);
              }
              if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            className={cn(
              'w-full bg-transparent resize-none border-none outline-none',
              'font-mono text-xs leading-relaxed placeholder:text-slate-600',
              'cursor-text focus:ring-0 p-0 block',
              shape === 'circle' && textAlign === 'center'
                ? 'h-auto text-center'
                : cn('h-full', alignClass)
            )}
            style={{
              color: textColorHex,
              ...(shape === 'circle' && textAlign === 'center'
                ? {
                    maxHeight: `${Math.max((node.height || 140) - 32, 20)}px`,
                    overflowY: 'auto',
                  }
                : {
                    minHeight: `${Math.max((node.height || 70) - 26, 20)}px`,
                  }),
            }}
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.id);
              setIsEditing(true);
            }}
            className={cn(
              'w-full cursor-text overflow-hidden prose-invert prose-xs break-words',
              '[&_p]:text-inherit [&_h1]:text-inherit [&_h2]:text-inherit [&_li]:text-inherit [&_strong]:text-inherit [&_em]:text-inherit',
              shape === 'square' && 'h-full',
              '[&_p]:m-0 [&_ul]:pl-3.5 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:my-1 [&_h2]:text-xs [&_h2]:font-bold [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded',
              shape === 'circle' && textAlign === 'center' ? 'text-center' : alignClass
            )}
            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
          />
        )}
      </div>

      {/* 4-Directional Plus Buttons (visible only on hover of this node) */}
      {renderDirectionButton('top', '-top-3 left-1/2 -translate-x-1/2', 'Above')}
      {renderDirectionButton('bottom', '-bottom-3 left-1/2 -translate-x-1/2', 'Below')}
      {renderDirectionButton('left', 'top-1/2 -left-3 -translate-y-1/2', 'Left')}
      {renderDirectionButton('right', 'top-1/2 -right-3 -translate-y-1/2', 'Right')}

      {/* Interactive Bottom-Right Click-and-Drag Resizing Grip */}
      <div
        data-resize-handle="true"
        onPointerDown={handleResizePointerDown}
        onClick={handleGripClick}
        onDoubleClick={(e) => {
          e.stopPropagation();
          triggerAutoFit();
        }}
        title="Drag to resize (Double-click to auto-fit content)"
        className={cn(
          'absolute z-30 cursor-se-resize flex items-center justify-center transition-opacity',
          shape === 'circle' ? 'bottom-2 right-2 w-4 h-4' : 'bottom-0 right-0 w-4 h-4',
          'opacity-0 group-hover:opacity-80'
        )}
      >
        <div className={cn('w-2 h-2 border-r-2 border-b-2', theme.bracket)} />
      </div>
    </div>
  );
};
