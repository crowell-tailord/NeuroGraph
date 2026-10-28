import { useState, useCallback, useEffect, useRef } from 'react';
import { useMindMap } from './hooks/useMindMap';
import { useViewport } from './hooks/useViewport';
import { TopHeader } from './components/header/TopHeader';
import { AdHocNotesPanel } from './components/notes/AdHocNotesPanel';
import { MindMapCanvas } from './components/canvas/MindMapCanvas';
import { FloatingMenu } from './components/dock/FloatingMenu';
import { OpenMapModal } from './components/dialogs/OpenMapModal';
import { ProjectSettingsModal } from './components/dialogs/ProjectSettingsModal';
import { MindMapDocument, NodeDirection } from './types/mindmap';

export function App() {
  const {
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
    detachNode,
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
  } = useMindMap();

  const {
    viewport,
    panToNode,
    fitToNodes,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useViewport({ initialPanX: 100, initialPanY: 100, initialZoom: 1 });

  const [openMapModalVisible, setOpenMapModalVisible] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // When adding child node in any direction, smoothly slide canvas to center on new node
  const handleAddChild = useCallback(
    (parentId: string, direction: NodeDirection = 'bottom') => {
      const newNode = addChildNode(parentId, direction);
      if (newNode) {
        // Slide viewport smoothly so the new child node is centered on screen!
        setTimeout(() => {
          panToNode(newNode);
        }, 15);
      }
    },
    [addChildNode, panToNode]
  );

  // When adding sibling node, center it
  const handleAddSibling = useCallback(
    (nodeId: string) => {
      const newNode = addSiblingNode(nodeId);
      if (newNode) {
        setTimeout(() => {
          panToNode(newNode);
        }, 15);
      }
    },
    [addSiblingNode, panToNode]
  );

  // When initializing root node from center plus button
  const handleAddRoot = useCallback(() => {
    hasInitiallyCentered.current = false;
    const canvasCenterX = (window.innerWidth / 2 - viewport.panX) / viewport.zoom - 100;
    const canvasCenterY = (window.innerHeight / 2 - viewport.panY) / viewport.zoom - 35;
    const root = addRootNode(Math.round(canvasCenterX), Math.round(canvasCenterY));
    setTimeout(() => {
      panToNode(root, true);
    }, 10);
  }, [addRootNode, panToNode, viewport.panX, viewport.panY, viewport.zoom]);

  const hasInitiallyCentered = useRef(false);

  // Automatically center the parent node thought on page load / refresh
  useEffect(() => {
    if (hasInitiallyCentered.current || doc.nodes.length === 0) return;
    const parentNode = doc.nodes.find((n) => n.parentId === null) || doc.nodes[0];
    if (parentNode) {
      hasInitiallyCentered.current = true;
      // Center immediately on the parent node thought
      panToNode(parentNode, true);
    }
  }, [doc.nodes, panToNode]);

  const handleSelectMap = (selectedDoc: MindMapDocument) => {
    loadMap(selectedDoc);
    const parentNode = selectedDoc.nodes.find((n) => n.parentId === null) || selectedDoc.nodes[0];
    if (parentNode) {
      setTimeout(() => {
        panToNode(parentNode, false);
      }, 50);
    } else {
      setTimeout(() => {
        fitToNodes(selectedDoc.nodes);
      }, 50);
    }
  };

  // Global keyboard shortcuts:
  // - Cmd+S / Ctrl+S: save current mind map (overrides browser save page dialog)
  // - Backspace / Delete: delete currently selected node (when not inside an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();

        // If an input/textarea is currently focused, blur it to commit any in-progress edits
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable)
        ) {
          (activeEl as HTMLElement).blur();
        }

        saveMapToBackend();
        return;
      }

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedNodeId) {
        e.preventDefault();
        deleteNode(selectedNodeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveMapToBackend, selectedNodeId, deleteNode]);

  // Prompt before unload if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08090c] font-sans">
      {/* Top Title Bar with Telemetry & Unsaved Warning Banner */}
      <TopHeader
        title={doc.title}
        nodeCount={doc.nodes.length}
        zoom={viewport.zoom}
        saveStatus={saveStatus}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        settings={doc.settings}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onSave={() => saveMapToBackend()}
        onTitleChange={updateTitle}
      />

      {/* Ad-Hoc Notes Stack (positioned in upper-left below site title, expandable/collapsible) */}
      <AdHocNotesPanel
        notes={doc.adHocNotes || []}
        onAddNote={addAdHocNote}
        onUpdateNoteText={updateAdHocNoteText}
        onToggleCollapse={toggleAdHocNoteCollapse}
        onDeleteNote={deleteAdHocNote}
      />

      {/* Main Full-screen Mind Map Canvas */}
      <MindMapCanvas
        nodes={doc.nodes}
        viewport={viewport}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onMoveNode={updateNodePosition}
        onTextChange={updateNodeText}
        onAddChild={handleAddChild}
        onAddSibling={handleAddSibling}
        onDeleteNode={deleteNode}
        onDuplicateNode={duplicateNode}
        onColorChange={updateNodeColor}
        onShapeChange={updateNodeShape}
        onTextAlignChange={updateNodeTextAlign}
        onTextColorChange={updateNodeTextColor}
        onDetachNode={detachNode}
        onAttachNodes={attachNodes}
        onDimensionsChange={updateNodeDimensions}
        onAddRoot={handleAddRoot}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Floating Tactical Bottom Menu */}
      <FloatingMenu
        doc={doc}
        onNewMap={() => {
          hasInitiallyCentered.current = false;
          createNewMap('UNTITLED SCHEMATIC');
        }}
        onOpenMapModal={() => setOpenMapModalVisible(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onSaveMap={() => saveMapToBackend()}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onFitView={() => fitToNodes(doc.nodes)}
        isSaving={isSaving}
      />

      {/* Open Map Modal from JSON Database */}
      <OpenMapModal
        open={openMapModalVisible}
        onOpenChange={setOpenMapModalVisible}
        onSelectMap={handleSelectMap}
        currentMapId={doc.id}
      />

      {/* Project Settings Modal */}
      <ProjectSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        settings={doc.settings || { defaultColor: 'red', defaultShape: 'square' }}
        saveStatus={saveStatus}
        onUpdateSettings={updateProjectSettings}
      />
    </div>
  );
}

export default App;
