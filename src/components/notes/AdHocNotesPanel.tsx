import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, Edit3, FileText, Check } from 'lucide-react';
import { marked } from 'marked';
import { AdHocNote } from '../../types/mindmap';
import { cn } from '../../lib/utils';

interface AdHocNotesPanelProps {
  notes: AdHocNote[];
  onAddNote: (text?: string) => void;
  onUpdateNoteText: (id: string, text: string) => void;
  onToggleCollapse: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

interface SingleNoteCardProps {
  note: AdHocNote;
  index: number;
  onUpdateText: (text: string) => void;
  onToggleCollapse: () => void;
  onDelete: () => void;
}

const SingleNoteCard: React.FC<SingleNoteCardProps> = ({
  note,
  index,
  onUpdateText,
  onToggleCollapse,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(note.text.trim() === '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const renderedMarkdown = useMemo(() => {
    if (!note.text.trim()) {
      return '<p class="text-slate-500 italic text-xs">Empty note...</p>';
    }
    try {
      return marked.parse(note.text, { async: false, breaks: true, gfm: true }) as string;
    } catch {
      return note.text;
    }
  }, [note.text]);

  const firstLinePreview = useMemo(() => {
    const lines = note.text.trim().split('\n');
    return lines[0]?.replace(/[#*`_-]/g, '').trim() || `Note 0${index + 1}`;
  }, [note.text, index]);

  const isCollapsed = Boolean(note.isCollapsed);

  return (
    <div
      className={cn(
        'group relative w-full rounded-sm bg-[#0e1118]/90 backdrop-blur-md border border-white/[0.08]',
        'hover:border-cyan-500/40 shadow-xl transition-all duration-200 select-none overflow-hidden'
      )}
    >
      {/* Tactical Corner Brackets */}
      <div className="corner-bracket-tl text-cyan-500/70" />
      <div className="corner-bracket-tr text-cyan-500/70" />
      <div className="corner-bracket-bl text-cyan-500/70" />
      <div className="corner-bracket-br text-cyan-500/70" />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/40 border-b border-white/[0.06] font-mono text-[10px]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-300 cursor-pointer text-left truncate flex-1 mr-2"
          title={isCollapsed ? 'Click to expand note' : 'Click to collapse note'}
        >
          {isCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}
          <span className="font-semibold tracking-wider truncate">
            {isCollapsed ? firstLinePreview : `// NOTE_${String(index + 1).padStart(2, '0')}`}
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? 'View rendered markdown' : 'Edit raw note'}
              className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-white/[0.06] rounded transition-colors"
            >
              {isEditing ? <Check className="w-3 h-3 text-emerald-400" /> : <Edit3 className="w-3 h-3" />}
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            title="Delete this note"
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {!isCollapsed && (
        <div className="p-2.5 font-mono text-xs leading-relaxed text-slate-100 animate-in fade-in-50 duration-150">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={note.text}
              placeholder="Type note (markdown supported)..."
              onChange={(e) => onUpdateText(e.target.value)}
              onBlur={() => {
                if (note.text.trim()) {
                  setIsEditing(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  setIsEditing(false);
                }
                if (e.key === 'Escape') {
                  setIsEditing(false);
                }
              }}
              rows={4}
              className="w-full bg-transparent resize-y border-none outline-none font-mono text-xs text-slate-100 placeholder:text-slate-600 block focus:ring-0 p-0"
              style={{ minHeight: '60px' }}
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              title="Click to edit note"
              className="w-full cursor-text overflow-hidden prose-invert prose-xs min-h-[40px] [&_p]:m-0 [&_ul]:pl-3.5 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h1]:font-bold [&_h2]:text-xs [&_h2]:font-bold [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded"
              dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export const AdHocNotesPanel: React.FC<AdHocNotesPanelProps> = ({
  notes,
  onAddNote,
  onUpdateNoteText,
  onToggleCollapse,
  onDeleteNote,
}) => {
  return (
    <div
      className="fixed top-[72px] left-4 z-30 pointer-events-auto flex flex-col gap-2 w-72 max-h-[calc(100vh-140px)] overflow-y-auto pr-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      {/* Render all created notes */}
      {notes.map((note, idx) => (
        <SingleNoteCard
          key={note.id}
          note={note}
          index={idx}
          onUpdateText={(text) => onUpdateNoteText(note.id, text)}
          onToggleCollapse={() => onToggleCollapse(note.id)}
          onDelete={() => onDeleteNote(note.id)}
        />
      ))}

      {/* '+ Add Note' Box (always positioned directly below the existing notes) */}
      <button
        type="button"
        onClick={() => onAddNote()}
        className={cn(
          'group flex items-center justify-between px-3 py-2 rounded-sm',
          'bg-[#0e1118]/85 hover:bg-[#151924] border border-white/[0.08] hover:border-cyan-500/40',
          'text-slate-400 hover:text-cyan-300 font-mono text-xs shadow-md transition-all duration-200 cursor-pointer'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
            <Plus className="w-3 h-3 stroke-[2.5]" />
          </div>
          <span className="font-semibold tracking-wider text-[11px] uppercase">Add Note</span>
        </div>
        <FileText className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
      </button>
    </div>
  );
};
