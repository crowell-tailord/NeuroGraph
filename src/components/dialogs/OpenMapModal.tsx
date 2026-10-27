import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FolderOpen, Trash2, ArrowRight, Upload, Clock, Layers } from 'lucide-react';
import { MindMapDocument } from '../../types/mindmap';
import { cn } from '../../lib/utils';

interface OpenMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMap: (doc: MindMapDocument) => void;
  currentMapId: string;
}

export const OpenMapModal: React.FC<OpenMapModalProps> = ({
  open,
  onOpenChange,
  onSelectMap,
  currentMapId,
}) => {
  const [maps, setMaps] = useState<MindMapDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMaps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/maps');
      if (res.ok) {
        const list = await res.json();
        setMaps(list);
      }
    } catch {
      // Local fallback
      const found: MindMapDocument[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('neurograph_doc_') || key.startsWith('mindmapper_doc_'))) {
          try {
            found.push(JSON.parse(localStorage.getItem(key) || ''));
          } catch {
            // ignore
          }
        }
      }
      setMaps(found);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMaps();
    }
  }, [open]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this map?')) return;

    try {
      await fetch(`/api/maps/${id}`, { method: 'DELETE' });
    } catch {
      // local
    }
    localStorage.removeItem(`mindmapper_doc_${id}`);
    setMaps((prev) => prev.filter((m) => m.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          onSelectMap(parsed);
          onOpenChange(false);
        } else {
          alert('Invalid mind map JSON format.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0e1119] border border-white/10 rounded-sm p-6 shadow-2xl z-50 font-mono text-slate-200 animate-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-rose-400" />
              <Dialog.Title className="text-sm font-bold tracking-wider text-slate-100">
                SAVED SCHEMATICS // DATABASE
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="text-slate-500 hover:text-slate-300 p-1">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Maps List */}
          <div className="my-4 max-h-72 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="text-center py-8 text-xs text-slate-500">
                ACCESSING JSON REPOSITORY...
              </div>
            ) : maps.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                NO SAVED MAPS IN DATABASE
              </div>
            ) : (
              maps.map((m) => {
                const isCurrent = m.id === currentMapId;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectMap(m);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'group flex items-center justify-between p-3 rounded-sm border cursor-pointer transition-all',
                      isCurrent
                        ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                        : 'bg-[#131622]/60 border-white/[0.06] hover:border-white/20 hover:bg-[#181c2b]'
                    )}
                  >
                    <div className="overflow-hidden pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs tracking-wide text-slate-200 group-hover:text-rose-400 transition-colors truncate">
                          {m.title || 'UNTITLED MAP'}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded uppercase">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {m.nodes?.length || 0} nodes
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(m.updatedAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(m.id, e)}
                        title="Delete schematic"
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-slate-600 group-hover:text-rose-400 pl-1">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Import JSON Action Bar */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer py-1 px-2.5 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import JSON File</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <Dialog.Close asChild>
              <button className="text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/10 text-slate-300">
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
