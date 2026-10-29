import React, { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  ListTree,
  Copy,
  Check,
  Target,
  FileText,
  CornerDownRight,
} from 'lucide-react';
import { MindMapNode, NodeColor, getNodeParentIds } from '../../types/mindmap';
import { cn } from '../../lib/utils';

interface OutlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: MindMapNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: MindMapNode) => void;
}

interface OutlineNodeItem {
  node: MindMapNode;
  depth: number;
  children: OutlineNodeItem[];
}

const COLOR_DOTS: Record<NodeColor, string> = {
  red: 'bg-rose-500',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-400',
};

export const OutlineModal: React.FC<OutlineModalProps> = ({
  open,
  onOpenChange,
  nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  const [copied, setCopied] = useState(false);

  // Build recursive outline tree
  const outlineTree = useMemo(() => {
    if (nodes.length === 0) return [];

    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    // Find child relationships
    const childrenMap = new Map<string, MindMapNode[]>();
    nodes.forEach((n) => {
      const parentIds = getNodeParentIds(n);
      parentIds.forEach((pid) => {
        const list = childrenMap.get(pid) || [];
        list.push(n);
        childrenMap.set(pid, list);
      });
    });

    const visitedGlobal = new Set<string>();

    const buildTree = (node: MindMapNode, depth: number, currentPath: Set<string>): OutlineNodeItem => {
      visitedGlobal.add(node.id);
      const nextPath = new Set(currentPath).add(node.id);
      const rawChildren = childrenMap.get(node.id) || [];
      const children: OutlineNodeItem[] = [];

      for (const child of rawChildren) {
        if (!nextPath.has(child.id)) {
          children.push(buildTree(child, depth + 1, nextPath));
        }
      }

      return { node, depth, children };
    };

    const tree: OutlineNodeItem[] = [];

    // Roots are nodes with no parents
    const rootNodes = nodes.filter((n) => getNodeParentIds(n).length === 0);

    rootNodes.forEach((root) => {
      tree.push(buildTree(root, 0, new Set()));
    });

    // If there were any unvisited nodes (e.g. disconnected floating islands or loops)
    const unvisited = nodes.filter((n) => !visitedGlobal.has(n.id));
    unvisited.forEach((floating) => {
      tree.push(buildTree(floating, 0, new Set()));
    });

    return tree;
  }, [nodes]);

  // Generate plain markdown bullet list text for copying
  const markdownOutline = useMemo(() => {
    const lines: string[] = [];

    const traverse = (items: OutlineNodeItem[]) => {
      items.forEach((item) => {
        const indent = '  '.repeat(item.depth);
        const text = item.node.text.trim() || 'Untitled thought';
        const singleLineText = text.replace(/\n+/g, ' ');
        lines.push(`${indent}- ${singleLineText}`);
        if (item.children.length > 0) {
          traverse(item.children);
        }
      });
    };

    traverse(outlineTree);
    return lines.join('\n');
  }, [outlineTree]);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownOutline);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy outline', err);
    }
  };

  const renderOutlineItems = (items: OutlineNodeItem[]) => {
    return items.map((item) => {
      const isSelected = selectedNodeId === item.node.id;
      const dotColor = COLOR_DOTS[item.node.color] || COLOR_DOTS.red;
      const textPreview = item.node.text.trim() || '(Untitled Thought)';

      return (
        <React.Fragment key={item.node.id}>
          <div
            style={{ paddingLeft: `${item.depth * 20 + 8}px` }}
            className={cn(
              'group flex items-start gap-2.5 py-1.5 pr-2 rounded transition-all cursor-pointer font-mono text-xs',
              isSelected
                ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 shadow-sm'
                : 'text-slate-300 hover:bg-white/[0.05] hover:text-white border border-transparent'
            )}
            onClick={() => {
              onSelectNode(item.node);
            }}
          >
            {/* Indent connector branch icon for depth > 0 */}
            {item.depth > 0 && (
              <CornerDownRight className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
            )}

            {/* Bullet indicator */}
            <div className="flex items-center gap-1.5 shrink-0 mt-1">
              <span className={cn('w-2 h-2 rounded-full shadow-sm', dotColor)} />
            </div>

            {/* Node Text */}
            <div className="flex-1 min-w-0">
              <span className="break-words leading-relaxed">
                {textPreview}
              </span>
            </div>

            {/* Jump button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(item.node);
                onOpenChange(false);
              }}
              title="Pan to node on canvas"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-opacity shrink-0"
            >
              <Target className="w-3.5 h-3.5" />
            </button>
          </div>

          {item.children.length > 0 && renderOutlineItems(item.children)}
        </React.Fragment>
      );
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-[#0e1119] border border-white/10 rounded-sm p-6 shadow-2xl z-50 font-mono text-slate-200 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ListTree className="w-4 h-4" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                  OUTLINE VIEW
                </Dialog.Title>
                <div className="text-[10px] text-slate-500 tracking-wider">
                  BULLET LIST HIERARCHY ({nodes.length} NODES)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                disabled={nodes.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                title="Copy hierarchical bullet list as Markdown"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Close outline"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Scrollable Outline List */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1 py-1 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <FileText className="w-8 h-8 opacity-40" />
                <span className="text-xs">No nodes on canvas yet</span>
              </div>
            ) : (
              renderOutlineItems(outlineTree)
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span>Click any thought to inspect and pan to it on canvas</span>
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-1.5 rounded-sm bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 font-mono text-xs font-semibold uppercase transition-colors cursor-pointer"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
