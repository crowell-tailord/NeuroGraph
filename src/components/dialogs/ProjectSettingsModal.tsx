import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Sliders,
  Square,
  Circle,
  Check,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { NodeColor, NodeShape, ProjectSettings } from '../../types/mindmap';
import { cn } from '../../lib/utils';

interface ProjectSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ProjectSettings;
  saveStatus?: 'idle' | 'saved' | 'saving' | 'error';
  onUpdateSettings: (settings: Partial<ProjectSettings>) => void;
}

const COLOR_OPTIONS: {
  id: NodeColor;
  label: string;
  dotClass: string;
  glowClass: string;
  borderClass: string;
  bgLightClass: string;
  textColor: string;
}[] = [
  {
    id: 'red',
    label: 'Rose Red',
    dotClass: 'bg-rose-500',
    glowClass: 'shadow-[0_0_15px_rgba(244,63,94,0.35)]',
    borderClass: 'border-rose-500',
    bgLightClass: 'bg-rose-500/15',
    textColor: 'text-rose-400',
  },
  {
    id: 'cyan',
    label: 'Cyber Cyan',
    dotClass: 'bg-cyan-500',
    glowClass: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
    borderClass: 'border-cyan-500',
    bgLightClass: 'bg-cyan-500/15',
    textColor: 'text-cyan-400',
  },
  {
    id: 'amber',
    label: 'Tactical Amber',
    dotClass: 'bg-amber-500',
    glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
    borderClass: 'border-amber-500',
    bgLightClass: 'bg-amber-500/15',
    textColor: 'text-amber-400',
  },
  {
    id: 'emerald',
    label: 'Emerald Green',
    dotClass: 'bg-emerald-500',
    glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.35)]',
    borderClass: 'border-emerald-500',
    bgLightClass: 'bg-emerald-500/15',
    textColor: 'text-emerald-400',
  },
  {
    id: 'purple',
    label: 'Void Purple',
    dotClass: 'bg-purple-500',
    glowClass: 'shadow-[0_0_15px_rgba(168,85,247,0.35)]',
    borderClass: 'border-purple-500',
    bgLightClass: 'bg-purple-500/15',
    textColor: 'text-purple-400',
  },
  {
    id: 'slate',
    label: 'Ghost Slate',
    dotClass: 'bg-slate-400',
    glowClass: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]',
    borderClass: 'border-slate-400',
    bgLightClass: 'bg-slate-500/15',
    textColor: 'text-slate-300',
  },
];

const SHAPE_OPTIONS: {
  id: NodeShape;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'square',
    label: 'Tactical Box',
    description: 'Sharp corners with tactical HUD bracket accents',
    icon: Square,
  },
  {
    id: 'circle',
    label: 'Circular Orb',
    description: 'Smooth round node with centered thought layout',
    icon: Circle,
  },
];

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  open,
  onOpenChange,
  settings,
  saveStatus,
  onUpdateSettings,
}) => {
  const currentColor = settings.defaultColor || 'red';
  const currentShape = settings.defaultShape || 'square';

  const activeColorMeta = COLOR_OPTIONS.find((c) => c.id === currentColor) || COLOR_OPTIONS[0];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0e1119] border border-white/10 rounded-sm p-6 shadow-2xl z-50 font-mono text-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                  PROJECT SETTINGS
                </Dialog.Title>
                <div className="text-[10px] text-slate-500 tracking-wider">
                  NODE INITIALIZATION PARAMETERS
                </div>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-6">
            {/* Setting 1: Default Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Default Node Color
                </label>
                <span className={cn('text-[11px] font-semibold tracking-wider uppercase', activeColorMeta.textColor)}>
                  {activeColorMeta.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Dictates the accent border, glow, and theme color for newly created nodes.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_OPTIONS.map((c) => {
                  const isSelected = currentColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onUpdateSettings({ defaultColor: c.id })}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-sm border transition-all cursor-pointer text-left',
                        isSelected
                          ? cn('bg-white/[0.07] border-white/40 ring-1 ring-white/20', c.glowClass)
                          : 'bg-[#121622]/60 border-white/[0.06] hover:bg-white/[0.04] hover:border-white/20'
                      )}
                    >
                      <span className={cn('w-3.5 h-3.5 rounded-full shrink-0 shadow-sm', c.dotClass)} />
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-xs font-semibold truncate', isSelected ? 'text-white' : 'text-slate-300')}>
                          {c.label}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Setting 2: Default Shape */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  Default Node Shape
                </label>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-cyan-400">
                  {currentShape === 'square' ? 'Tactical Box' : 'Circular Orb'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Sets the geometric frame structure for newly spawned thought nodes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SHAPE_OPTIONS.map((shape) => {
                  const isSelected = currentShape === shape.id;
                  const Icon = shape.icon;
                  return (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => onUpdateSettings({ defaultShape: shape.id })}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-sm border transition-all cursor-pointer text-left',
                        isSelected
                          ? 'bg-white/[0.07] border-cyan-500/60 ring-1 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-[#121622]/60 border-white/[0.06] hover:bg-white/[0.04] hover:border-white/20'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2 rounded mt-0.5 shrink-0 border',
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            : 'bg-white/[0.04] border-white/10 text-slate-400'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-xs font-bold tracking-wider uppercase',
                              isSelected ? 'text-white' : 'text-slate-300'
                            )}
                          >
                            {shape.label}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[2.5]" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          {shape.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="p-3.5 rounded-sm bg-[#090b10] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-rose-400" />
                  Live New Node Preview
                </span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                  {currentShape} // {currentColor}
                </span>
              </div>

              <div className="flex items-center justify-center p-6 bg-[#06070a]/80 rounded border border-dashed border-white/10">
                <div
                  className={cn(
                    'relative bg-[#0f1118]/95 backdrop-blur-md border transition-all duration-300',
                    activeColorMeta.borderClass,
                    activeColorMeta.glowClass,
                    currentShape === 'circle'
                      ? 'w-32 h-32 rounded-full flex flex-col items-center justify-center p-4 text-center'
                      : 'w-52 h-20 rounded-sm p-3 flex flex-col justify-between'
                  )}
                >
                  {/* Tactical Brackets for Square */}
                  {currentShape === 'square' && (
                    <>
                      <div className={cn('corner-bracket-tl', activeColorMeta.textColor)} />
                      <div className={cn('corner-bracket-tr', activeColorMeta.textColor)} />
                      <div className={cn('corner-bracket-bl', activeColorMeta.textColor)} />
                      <div className={cn('corner-bracket-br', activeColorMeta.textColor)} />
                    </>
                  )}

                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', activeColorMeta.dotClass)} />
                      <span className="text-[10px] font-bold text-slate-200 tracking-wider">
                        {currentShape === 'circle' ? 'ORB NODE' : 'SCHEMATIC NODE'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 tracking-wide font-mono mt-1">
                    {currentShape === 'circle' ? (
                      <span className="text-[10px] leading-tight block text-slate-300">
                        Central Thought
                      </span>
                    ) : (
                      <span className="text-slate-300 font-medium truncate block">
                        New thought node text...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Informational Callout */}
            <div className="flex items-start gap-2.5 p-3 rounded-sm bg-rose-500/[0.06] border border-rose-500/20 text-slate-400 text-[11px] leading-relaxed">
              <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                All future nodes spawned from the root plus sign, directional connection buttons, or
                context menu actions will inherit these defaults. Existing nodes will keep their current styling.
              </span>
            </div>
          </div>

          {/* Footer Action with Auto-Save Telemetry */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-mono">
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-400 font-medium">Auto-saving settings...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">Settings auto-saved to project</span>
                </>
              )}
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="px-5 py-2 rounded-sm bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
              >
                Apply & Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
