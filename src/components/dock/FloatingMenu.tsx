import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Image as ImageIcon,
  Code2,
  RotateCcw,
  Sliders,
  ListTree,
} from 'lucide-react';
import { MindMapDocument } from '../../types/mindmap';
import { exportToPDF, exportToPNG } from '../../utils/pdfExport';
import { cn } from '../../lib/utils';

interface FloatingMenuProps {
  doc: MindMapDocument;
  onNewMap: () => void;
  onOpenMapModal: () => void;
  onOpenSettings?: () => void;
  onOpenOutline?: () => void;
  onSaveMap: () => Promise<boolean>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  isSaving: boolean;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  doc,
  onNewMap,
  onOpenMapModal,
  onOpenSettings,
  onOpenOutline,
  onSaveMap,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitView,
  isSaving,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF({
        title: doc.title,
        elementId: 'mindmap-canvas-container',
        nodes: doc.nodes,
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Make sure nodes are visible on canvas.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      await exportToPNG({
        title: doc.title,
        elementId: 'mindmap-canvas-container',
        nodes: doc.nodes,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(doc, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const confirmNewMap = () => {
    if (confirm('Start a new mind map? Any unsaved edits will be preserved in database.')) {
      onNewMap();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 select-none">
      <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-[#0d1017]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl font-mono text-xs text-slate-200">
        {/* New Map */}
        <button
          type="button"
          onClick={confirmNewMap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-300 hover:text-white"
          title="Create a new schematic map"
        >
          <FilePlus className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">New</span>
        </button>

        {/* Open Map */}
        <button
          type="button"
          onClick={onOpenMapModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-300 hover:text-white"
          title="Open saved map from JSON database"
        >
          <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Open</span>
        </button>

        {/* Save Map */}
        <button
          type="button"
          onClick={() => onSaveMap()}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-300 hover:text-white disabled:opacity-50"
          title="Save changes to local database (⌘S / Ctrl+S)"
        >
          <Save className={cn('w-3.5 h-3.5 text-emerald-400', isSaving && 'animate-spin')} />
          <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
          <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-400 font-sans">
            ⌘S
          </kbd>
        </button>

        {/* Project Settings */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-300 hover:text-white"
            title="Configure Project Settings (Default Color & Shape)"
          >
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}

        {/* Outline View */}
        {onOpenOutline && (
          <button
            type="button"
            onClick={onOpenOutline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-300 hover:text-white"
            title="Outline View: View nodes as a bullet list outline"
          >
            <ListTree className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Outline</span>
          </button>
        )}

        {/* Separator */}
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Export Dropdown (PDF, PNG, JSON) */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 active:bg-rose-500/35 transition-colors cursor-pointer text-rose-300 font-semibold"
            >
              <Download className={cn('w-3.5 h-3.5', isExporting && 'animate-bounce')} />
              <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="center"
              side="top"
              sideOffset={10}
              className="min-w-[170px] p-1.5 rounded bg-[#0d0f16]/95 border border-white/10 shadow-2xl backdrop-blur-xl font-mono text-xs text-slate-200 z-50 animate-in fade-in-50 zoom-in-95"
            >
              <div className="px-2 py-1 text-[9px] uppercase tracking-widest text-slate-500 border-b border-white/[0.07] mb-1 font-semibold">
                EXPORT SCHEMATIC
              </div>

              <DropdownMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer outline-none hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                onSelect={handleExportPDF}
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Export as PDF</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer outline-none hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors"
                onSelect={handleExportPNG}
              >
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export as Image (PNG)</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer outline-none hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                onSelect={handleExportJSON}
              >
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Download JSON File</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Separator */}
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            className="p-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-400 hover:text-white"
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            className="p-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onFitView}
            className="p-1.5 rounded hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-slate-400 hover:text-white ml-0.5"
            title="Fit All Nodes in View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
