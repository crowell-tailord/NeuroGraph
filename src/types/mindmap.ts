export type NodeColor = 'red' | 'amber' | 'cyan' | 'emerald' | 'purple' | 'slate';
export type NodeTextColor = 'default' | 'red' | 'amber' | 'cyan' | 'emerald' | 'purple' | 'slate';
export type NodeShape = 'square' | 'circle';
export type NodeDirection = 'top' | 'bottom' | 'left' | 'right';
export type TextAlign = 'left' | 'center' | 'right';

export interface MindMapNode {
  id: string;
  parentId: string | null;
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
