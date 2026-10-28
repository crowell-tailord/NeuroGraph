export type NodeColor = 'red' | 'amber' | 'cyan' | 'emerald' | 'purple' | 'slate';
export type NodeTextColor = 'default' | 'red' | 'amber' | 'cyan' | 'emerald' | 'purple' | 'slate';
export type NodeShape = 'square' | 'circle';
export type NodeDirection = 'top' | 'bottom' | 'left' | 'right';
export type TextAlign = 'left' | 'center' | 'right';

export interface MindMapNode {
  id: string;
  parentId: string | null;
  parentIds?: string[];
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: NodeColor;
  textColor?: NodeTextColor;
  tag?: string;
  shape?: NodeShape;
  textAlign?: TextAlign;
  createdAt: number;
}

// Max connections limit per node: null represents unlimited connections.
// If a strict cap is ever required, set this to a positive integer (e.g. 4).
export const MAX_CONNECTIONS_PER_NODE: number | null = null;

/**
 * Returns all parent IDs for a node, backward-compatible with legacy single-parentId nodes.
 */
export function getNodeParentIds(node: MindMapNode): string[] {
  if (Array.isArray(node.parentIds) && node.parentIds.length > 0) {
    return Array.from(new Set(node.parentIds.filter(Boolean)));
  }
  return node.parentId ? [node.parentId] : [];
}

/**
 * Returns the total number of connections (both incoming parents and outgoing children) for a node.
 */
export function getNodeTotalConnections(node: MindMapNode, allNodes: MindMapNode[]): number {
  const incoming = getNodeParentIds(node).length;
  let outgoing = 0;
  for (const n of allNodes) {
    if (n.id !== node.id && getNodeParentIds(n).includes(node.id)) {
      outgoing++;
    }
  }
  return incoming + outgoing;
}

/**
 * Checks whether two nodes are already connected in either direction.
 */
export function areNodesConnected(nodes: MindMapNode[], id1: string, id2: string): boolean {
  if (id1 === id2) return false;
  const n1 = nodes.find((n) => n.id === id1);
  const n2 = nodes.find((n) => n.id === id2);
  if (!n1 || !n2) return false;
  const p1 = getNodeParentIds(n1);
  const p2 = getNodeParentIds(n2);
  return p1.includes(id2) || p2.includes(id1);
}

export interface AdHocNote {
  id: string;
  text: string;
  isCollapsed?: boolean;
  createdAt: number;
}

export interface ProjectSettings {
  defaultColor: NodeColor;
  defaultShape: NodeShape;
}

export interface MindMapDocument {
  id: string;
  title: string;
  nodes: MindMapNode[];
  adHocNotes?: AdHocNote[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  settings?: ProjectSettings;
  updatedAt: number;
}

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}
