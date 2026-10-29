import { useState, useCallback, useEffect, useRef } from 'react';
import {
  MindMapDocument,
  MindMapNode,
  NodeColor,
  NodeTextColor,
  NodeShape,
  NodeDirection,
  TextAlign,
  LineType,
  NodeTextSize,
  AdHocNote,
  ProjectSettings,
  getNodeParentIds,
  getNodeTotalConnections,
  areNodesConnected,
  MAX_CONNECTIONS_PER_NODE,
} from '../types/mindmap';
import { generateId } from '../lib/utils';

const DEFAULT_MAP_ID = 'tactical-map-default';
const STORAGE_KEY_PREFIX = 'neurograph_doc_';

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  defaultColor: 'red',
  defaultShape: 'square',
  defaultLineType: 'solid',
  defaultTextSize: 'normal',
  lineRouting: 'curved',
};

export function useMindMap() {
  const [doc, setDoc] = useState<MindMapDocument>({
    id: DEFAULT_MAP_ID,
    title: 'SYSTEM SCHEMATIC ALPHA',
    updatedAt: Date.now(),
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
    settings: DEFAULT_PROJECT_SETTINGS,
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving' | 'error'>('idle');
  const initialLoadDone = useRef(false);
  const docRef = useRef(doc);
  docRef.current = doc;

  // Load initial map from API (/api/maps) or localStorage
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    async function loadInitial() {
      try {
        const res = await fetch('/api/maps');
        if (res.ok) {
          const maps: MindMapDocument[] = await res.json();
          if (maps && maps.length > 0) {
            const first = maps[0];
            setDoc({
              ...first,
              settings: {
                defaultColor: first.settings?.defaultColor || DEFAULT_PROJECT_SETTINGS.defaultColor,
                defaultShape: first.settings?.defaultShape || DEFAULT_PROJECT_SETTINGS.defaultShape,
                defaultLineType: first.settings?.defaultLineType || DEFAULT_PROJECT_SETTINGS.defaultLineType,
                defaultTextSize: first.settings?.defaultTextSize || DEFAULT_PROJECT_SETTINGS.defaultTextSize,
                lineRouting: first.settings?.lineRouting || DEFAULT_PROJECT_SETTINGS.lineRouting,
              },
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Backend API not available, loading from local storage', err);
      }

      // Fallback to localStorage
      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}${DEFAULT_MAP_ID}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setDoc({
            ...parsed,
            settings: {
              defaultColor: parsed.settings?.defaultColor || DEFAULT_PROJECT_SETTINGS.defaultColor,
              defaultShape: parsed.settings?.defaultShape || DEFAULT_PROJECT_SETTINGS.defaultShape,
              defaultLineType: parsed.settings?.defaultLineType || DEFAULT_PROJECT_SETTINGS.defaultLineType,
              defaultTextSize: parsed.settings?.defaultTextSize || DEFAULT_PROJECT_SETTINGS.defaultTextSize,
              lineRouting: parsed.settings?.lineRouting || DEFAULT_PROJECT_SETTINGS.lineRouting,
            },
          });
        } catch {
          // ignore
        }
      }
    }

    loadInitial();
  }, []);

  // Persist to localStorage whenever doc changes
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${doc.id}`, JSON.stringify(doc));
    } catch {
      // ignore
    }
  }, [doc]);

  // Save map explicitly to JSON DB via API
  const saveMapToBackend = useCallback(async (docToSave?: unknown): Promise<boolean> => {
    const isDoc = (d: unknown): d is MindMapDocument =>
      Boolean(d && typeof d === 'object' && 'id' in (d as Record<string, unknown>) && 'nodes' in (d as Record<string, unknown>) && Array.isArray((d as MindMapDocument).nodes));
    const currentDoc: MindMapDocument = isDoc(docToSave) ? docToSave : docRef.current;
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const res = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDoc),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveStatus('idle'), 2500);
        setIsSaving(false);
        return true;
      }
    } catch {
      // Local fallback
    }

    // Fallback save in localStorage
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${currentDoc.id}`, JSON.stringify(currentDoc));
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2500);
      setIsSaving(false);
      return true;
    } catch (err) {
      console.error('Failed to save mindmap to localStorage', err);
      setSaveStatus('error');
      setIsSaving(false);
      return false;
    }
  }, []);

  // Add the very first node in the center of the canvas
  const addRootNode = useCallback((x = 400, y = 250): MindMapNode => {
    let createdNode: MindMapNode | null = null;

    setDoc((prev) => {
      const defaultColor = prev.settings?.defaultColor || 'red';
      const defaultShape = prev.settings?.defaultShape || 'square';
      const defaultLineType = prev.settings?.defaultLineType || 'solid';
      const defaultTextSize = prev.settings?.defaultTextSize || 'normal';
      const width = defaultShape === 'circle' ? 140 : 220;
      const height = defaultShape === 'circle' ? 140 : 70;

      const newNode: MindMapNode = {
        id: generateId('root'),
        parentId: null,
        text: 'CENTRAL OBJECTIVE // CORE',
        x,
        y,
        width,
        height,
        color: defaultColor,
        shape: defaultShape,
        lineType: defaultLineType,
        textSize: defaultTextSize,
        createdAt: Date.now(),
      };
      createdNode = newNode;

      return {
        ...prev,
        updatedAt: Date.now(),
        nodes: [newNode],
      };
    });

    setHasUnsavedChanges(true);
    if (createdNode) {
      setSelectedNodeId((createdNode as MindMapNode).id);
      return createdNode;
    }

    const currentSettings = docRef.current.settings;
    const defaultColor = currentSettings?.defaultColor || 'red';
    const defaultShape = currentSettings?.defaultShape || 'square';
    const defaultLineType = currentSettings?.defaultLineType || 'solid';
    const defaultTextSize = currentSettings?.defaultTextSize || 'normal';
    const fallbackNode: MindMapNode = {
      id: generateId('root'),
      parentId: null,
      text: 'CENTRAL OBJECTIVE // CORE',
      x,
      y,
      width: defaultShape === 'circle' ? 140 : 220,
      height: defaultShape === 'circle' ? 140 : 70,
      color: defaultColor,
      shape: defaultShape,
      lineType: defaultLineType,
      textSize: defaultTextSize,
      createdAt: Date.now(),
    };
    setSelectedNodeId(fallbackNode.id);
    return fallbackNode;
  }, []);

  // Add a child node connected to a parent in a specific direction
  const addChildNode = useCallback(
    (parentId: string, direction: NodeDirection = 'bottom'): MindMapNode | null => {
      let createdNode: MindMapNode | null = null;

      setDoc((prev) => {
        const parent = prev.nodes.find((n) => n.id === parentId);
        if (!parent) return prev;

        const defaultColor = prev.settings?.defaultColor || 'red';
        const defaultShape = prev.settings?.defaultShape || 'square';
        const defaultLineType = prev.settings?.defaultLineType || 'solid';
        const defaultTextSize = prev.settings?.defaultTextSize || 'normal';

        const pW = parent.width || (parent.shape === 'circle' ? 140 : 200);
        const pH = parent.height || (parent.shape === 'circle' ? 140 : 70);
        const childW = defaultShape === 'circle' ? 140 : 200;
        const childH = defaultShape === 'circle' ? 140 : 70;

        let newX = parent.x;
        let newY = parent.y;

        switch (direction) {
          case 'top':
            newX = Math.round(parent.x + pW / 2 - childW / 2);
            newY = Math.round(parent.y - childH - 70);
            break;
          case 'left':
            newX = Math.round(parent.x - childW - 70);
            newY = Math.round(parent.y + pH / 2 - childH / 2);
            break;
          case 'right':
            newX = Math.round(parent.x + pW + 70);
            newY = Math.round(parent.y + pH / 2 - childH / 2);
            break;
          case 'bottom':
          default:
            newX = Math.round(parent.x + pW / 2 - childW / 2);
            newY = Math.round(parent.y + pH + 70);
            break;
        }

        const newNode: MindMapNode = {
          id: generateId('thought'),
          parentId: parent.id,
          parentIds: [parent.id],
          text: '',
          x: newX,
          y: newY,
          width: childW,
          height: childH,
          color: defaultColor,
          shape: defaultShape,
          lineType: parent.lineType || defaultLineType,
          connectionLineTypes: { [parent.id]: parent.lineType || defaultLineType },
          textSize: parent.textSize || defaultTextSize,
          createdAt: Date.now(),
        };

        createdNode = newNode;

        return {
          ...prev,
          updatedAt: Date.now(),
          nodes: [...prev.nodes, newNode],
        };
      });

      if (createdNode) {
        setHasUnsavedChanges(true);
        setSelectedNodeId((createdNode as MindMapNode).id);
      }

      return createdNode;
    },
    []
  );

  // Add a sibling node
  const addSiblingNode = useCallback((nodeId: string): MindMapNode | null => {
    let createdNode: MindMapNode | null = null;

    setDoc((prev) => {
      const node = prev.nodes.find((n) => n.id === nodeId);
      if (!node) return prev;

      const defaultColor = prev.settings?.defaultColor || 'red';
      const defaultShape = prev.settings?.defaultShape || 'square';
      const defaultLineType = prev.settings?.defaultLineType || 'solid';
      const defaultTextSize = prev.settings?.defaultTextSize || 'normal';
      const sibW = defaultShape === 'circle' ? 140 : 200;
      const sibH = defaultShape === 'circle' ? 140 : 70;

      const newX = node.x + (node.width || (node.shape === 'circle' ? 140 : 200)) + 50;
      const newY = node.y;

      const nodeParents = getNodeParentIds(node);
      const primaryParentId = nodeParents[0] || null;
      const initialConnectionTypes: Record<string, LineType> = {};
      if (primaryParentId) {
        initialConnectionTypes[primaryParentId] = node.lineType || defaultLineType;
      }

      const newNode: MindMapNode = {
        id: generateId('sibling'),
        parentId: primaryParentId,
        parentIds: nodeParents.length > 0 ? [...nodeParents] : [],
        text: '',
        x: newX,
        y: newY,
        width: sibW,
        height: sibH,
        color: defaultColor,
        shape: defaultShape,
        lineType: node.lineType || defaultLineType,
        connectionLineTypes: initialConnectionTypes,
        textSize: node.textSize || defaultTextSize,
        createdAt: Date.now(),
      };

      createdNode = newNode;

      return {
        ...prev,
        updatedAt: Date.now(),
        nodes: [...prev.nodes, newNode],
      };
    });

    if (createdNode) {
      setHasUnsavedChanges(true);
      setSelectedNodeId((createdNode as MindMapNode).id);
    }

    return createdNode;
  }, []);

  // Update node text
  const updateNodeText = useCallback((id: string, text: string) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, text } : n)),
    }));
  }, []);

  // Update node position (called during dragging at 60fps)
  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }));
  }, []);

  // Update node dimensions
  const updateNodeDimensions = useCallback((id: string, width: number, height: number) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === id && (n.width !== width || n.height !== height)
          ? { ...n, width: Math.round(width), height: Math.round(height) }
          : n
      ),
    }));
  }, []);

  // Update node color
  const updateNodeColor = useCallback((id: string, color: NodeColor) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, color } : n)),
    }));
  }, []);

  // Update node shape
  const updateNodeShape = useCallback((id: string, shape: NodeShape) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => {
        if (n.id !== id) return n;
        if (shape === 'circle') {
          const size = Math.max(n.width || 140, n.height || 140, 140);
          return {
            ...n,
            shape,
            width: size,
            height: size,
            textAlign: n.textAlign === 'left' ? 'center' : (n.textAlign || 'center'),
          };
        }
        return {
          ...n,
          shape,
          width: n.width || 200,
          height: n.height && n.height > 100 ? 70 : (n.height || 70),
        };
      }),
    }));
  }, []);

  // Update node text alignment
  const updateNodeTextAlign = useCallback((id: string, textAlign: TextAlign) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, textAlign } : n)),
    }));
  }, []);

  // Update node text color
  const updateNodeTextColor = useCallback((id: string, textColor: NodeTextColor) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, textColor } : n)),
    }));
  }, []);

  // Update node line type (solid, double, dotted)
  const updateNodeLineType = useCallback((id: string, lineType: LineType) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, lineType } : n)),
    }));
  }, []);

  // Update specific connection line type between parentId and childId
  const updateConnectionLineType = useCallback((parentId: string, childId: string, lineType: LineType) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => {
        if (n.id === childId) {
          return {
            ...n,
            connectionLineTypes: {
              ...(n.connectionLineTypes || {}),
              [parentId]: lineType,
            },
          };
        }
        if (n.id === parentId) {
          return {
            ...n,
            connectionLineTypes: {
              ...(n.connectionLineTypes || {}),
              [childId]: lineType,
            },
          };
        }
        return n;
      }),
    }));
  }, []);

  // Update node text size (normal, large, xlarge)
  const updateNodeTextSize = useCallback((id: string, textSize: NodeTextSize) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, textSize } : n)),
    }));
  }, []);

  // Detach all connections to/from a node (leaves the node floating)
  const detachNode = useCallback((id: string) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => {
        if (n.id === id) {
          return { ...n, parentId: null, parentIds: [], connectionLineTypes: {} };
        }
        const parents = getNodeParentIds(n);
        const newConnectionLineTypes = { ...(n.connectionLineTypes || {}) };
        delete newConnectionLineTypes[id];

        if (parents.includes(id)) {
          const updated = parents.filter((p) => p !== id);
          return {
            ...n,
            parentId: updated[0] || null,
            parentIds: updated,
            connectionLineTypes: newConnectionLineTypes,
          };
        }
        return {
          ...n,
          connectionLineTypes: newConnectionLineTypes,
        };
      }),
    }));
  }, []);

  // Detach a single specific connection between parentId and childId
  const detachConnection = useCallback((parentId: string, childId: string) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      nodes: prev.nodes.map((n) => {
        if (n.id === childId) {
          const currentParents = getNodeParentIds(n);
          const updated = currentParents.filter((p) => p !== parentId);
          const newConnectionLineTypes = { ...(n.connectionLineTypes || {}) };
          delete newConnectionLineTypes[parentId];
          return {
            ...n,
            parentId: updated[0] || null,
            parentIds: updated,
            connectionLineTypes: newConnectionLineTypes,
          };
        }
        if (n.id === parentId) {
          const currentParents = getNodeParentIds(n);
          const newConnectionLineTypes = { ...(n.connectionLineTypes || {}) };
          delete newConnectionLineTypes[childId];
          if (currentParents.includes(childId)) {
            const updated = currentParents.filter((p) => p !== childId);
            return {
              ...n,
              parentId: updated[0] || null,
              parentIds: updated,
              connectionLineTypes: newConnectionLineTypes,
            };
          }
          return {
            ...n,
            connectionLineTypes: newConnectionLineTypes,
          };
        }
        return n;
      }),
    }));
  }, []);

  // Drag and attach node connection (supports unlimited multiple connections per node)
  const attachNodes = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    setHasUnsavedChanges(true);
    setDoc((prev) => {
      const sourceNode = prev.nodes.find((n) => n.id === sourceId);
      const targetNode = prev.nodes.find((n) => n.id === targetId);
      if (!sourceNode || !targetNode) return prev;

      // Do not allow duplicate connections between the same pair
      if (areNodesConnected(prev.nodes, sourceId, targetId)) {
        return prev;
      }

      // Check max connections limit if configured (null = unlimited)
      if (MAX_CONNECTIONS_PER_NODE !== null) {
        if (
          getNodeTotalConnections(sourceNode, prev.nodes) >= MAX_CONNECTIONS_PER_NODE ||
          getNodeTotalConnections(targetNode, prev.nodes) >= MAX_CONNECTIONS_PER_NODE
        ) {
          return prev;
        }
      }

      const currentParents = getNodeParentIds(targetNode);
      const updatedParents = [...currentParents, sourceId];

      return {
        ...prev,
        updatedAt: Date.now(),
        nodes: prev.nodes.map((n) => {
          if (n.id === targetId) {
            return {
              ...n,
              parentId: updatedParents[0] || null,
              parentIds: updatedParents,
            };
          }
          return n;
        }),
      };
    });
  }, []);

  // Duplicate node
  const duplicateNode = useCallback((id: string) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => {
      const node = prev.nodes.find((n) => n.id === id);
      if (!node) return prev;

      const parents = getNodeParentIds(node);
      const duplicated: MindMapNode = {
        ...node,
        id: generateId('copy'),
        parentId: parents[0] || null,
        parentIds: parents.length > 0 ? [...parents] : [],
        x: node.x + 30,
        y: node.y + 30,
        text: `${node.text} (COPY)`,
        createdAt: Date.now(),
      };

      return {
        ...prev,
        updatedAt: Date.now(),
        nodes: [...prev.nodes, duplicated],
      };
    });
  }, []);

  // Delete node and cleanly re-parent or preserve remaining connections
  const deleteNode = useCallback((id: string) => {
    // Ensure body pointer-events is never left locked by any menu/dialog
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
    }

    setHasUnsavedChanges(true);
    setDoc((prev) => {
      const targetNode = prev.nodes.find((n) => n.id === id);
      if (!targetNode) return prev;

      const targetParents = getNodeParentIds(targetNode);

      // Clean up references to the deleted node in other nodes' parentIds
      const remainingNodes = prev.nodes
        .filter((n) => n.id !== id)
        .map((n) => {
          const currentParents = getNodeParentIds(n);
          if (currentParents.includes(id)) {
            const updated = currentParents.filter((p) => p !== id);
            // If it now has no parents but deleted node had parents, rewire to first parent
            if (updated.length === 0 && targetParents.length > 0) {
              return {
                ...n,
                parentId: targetParents[0],
                parentIds: [targetParents[0]],
              };
            }
            return {
              ...n,
              parentId: updated[0] || null,
              parentIds: updated,
            };
          }
          return n;
        });

      return {
        ...prev,
        updatedAt: Date.now(),
        nodes: remainingNodes,
      };
    });

    setSelectedNodeId((current) => (current === id ? null : current));
  }, []);

  // Start a fresh new map
  const createNewMap = useCallback((title = 'UNTITLED SCHEMATIC') => {
    const newDoc: MindMapDocument = {
      id: generateId('map'),
      title,
      updatedAt: Date.now(),
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [],
      settings: DEFAULT_PROJECT_SETTINGS,
    };
    setDoc(newDoc);
    setHasUnsavedChanges(false);
    setSelectedNodeId(null);
  }, []);

  // Load a map directly
  const loadMap = useCallback((newDoc: MindMapDocument) => {
    const populatedDoc: MindMapDocument = {
      ...newDoc,
      settings: {
        defaultColor: newDoc.settings?.defaultColor || DEFAULT_PROJECT_SETTINGS.defaultColor,
        defaultShape: newDoc.settings?.defaultShape || DEFAULT_PROJECT_SETTINGS.defaultShape,
        defaultLineType: newDoc.settings?.defaultLineType || DEFAULT_PROJECT_SETTINGS.defaultLineType,
        defaultTextSize: newDoc.settings?.defaultTextSize || DEFAULT_PROJECT_SETTINGS.defaultTextSize,
        lineRouting: newDoc.settings?.lineRouting || DEFAULT_PROJECT_SETTINGS.lineRouting,
      },
    };
    setDoc(populatedDoc);
    setHasUnsavedChanges(false);
    setSelectedNodeId(null);
  }, []);

  // Update project settings and auto-save the project
  const updateProjectSettings = useCallback(
    (newSettings: Partial<ProjectSettings>) => {
      let nextDoc: MindMapDocument | null = null;
      setDoc((prev) => {
        const current = prev.settings || DEFAULT_PROJECT_SETTINGS;
        const updated: ProjectSettings = {
          defaultColor: newSettings.defaultColor ?? current.defaultColor ?? 'red',
          defaultShape: newSettings.defaultShape ?? current.defaultShape ?? 'square',
          defaultLineType: newSettings.defaultLineType ?? current.defaultLineType ?? 'solid',
          defaultTextSize: newSettings.defaultTextSize ?? current.defaultTextSize ?? 'normal',
          lineRouting: newSettings.lineRouting ?? current.lineRouting ?? 'curved',
        };
        const updatedDoc: MindMapDocument = {
          ...prev,
          updatedAt: Date.now(),
          settings: updated,
        };
        nextDoc = updatedDoc;
        docRef.current = updatedDoc;
        return updatedDoc;
      });

      // Auto-save the project immediately after updating project settings
      if (nextDoc) {
        saveMapToBackend(nextDoc);
      }
    },
    [saveMapToBackend]
  );

  // Rename map
  const updateTitle = useCallback((title: string) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => {
      const updated = { ...prev, title, updatedAt: Date.now() };
      docRef.current = updated;
      return updated;
    });
  }, []);

  // Ad-hoc side notes
  const addAdHocNote = useCallback((text = ''): AdHocNote => {
    const newNote: AdHocNote = {
      id: generateId('note'),
      text,
      isCollapsed: false,
      createdAt: Date.now(),
    };
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      adHocNotes: [...(prev.adHocNotes || []), newNote],
    }));
    return newNote;
  }, []);

  const updateAdHocNoteText = useCallback((id: string, text: string) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      adHocNotes: (prev.adHocNotes || []).map((n) => (n.id === id ? { ...n, text } : n)),
    }));
  }, []);

  const toggleAdHocNoteCollapse = useCallback((id: string) => {
    setDoc((prev) => ({
      ...prev,
      adHocNotes: (prev.adHocNotes || []).map((n) =>
        n.id === id ? { ...n, isCollapsed: !n.isCollapsed } : n
      ),
    }));
  }, []);

  const deleteAdHocNote = useCallback((id: string) => {
    setHasUnsavedChanges(true);
    setDoc((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      adHocNotes: (prev.adHocNotes || []).filter((n) => n.id !== id),
    }));
  }, []);

  return {
    doc,
    selectedNodeId,
    setSelectedNodeId,
    addRootNode,
    addChildNode,
    addSiblingNode,
    updateNodeText,
    updateNodePosition,
    updateNodeDimensions,
    updateNodeColor,
    updateNodeShape,
    updateNodeTextAlign,
    updateNodeTextColor,
    updateNodeLineType,
    updateConnectionLineType,
    updateNodeTextSize,
    detachNode,
    detachConnection,
    attachNodes,
    duplicateNode,
    deleteNode,
    createNewMap,
    loadMap,
    updateTitle,
    addAdHocNote,
    updateAdHocNoteText,
    toggleAdHocNoteCollapse,
    deleteAdHocNote,
    updateProjectSettings,
    saveMapToBackend,
    isSaving,
    saveStatus,
    hasUnsavedChanges,
  };
}
