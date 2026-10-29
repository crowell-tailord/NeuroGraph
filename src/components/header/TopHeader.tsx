import React, { useState } from 'react';
import {
	CheckCircle2,
	RefreshCw,
	Cpu,
	AlertTriangle,
	Sliders,
} from 'lucide-react';
import { ProjectSettings } from '../../types/mindmap';
import { cn } from '../../lib/utils';

const version = __APP_VERSION__;

interface TopHeaderProps {
	title: string;
	nodeCount: number;
	zoom: number;
	saveStatus: 'idle' | 'saved' | 'saving' | 'error';
	hasUnsavedChanges: boolean;
	isSaving: boolean;
	settings?: ProjectSettings;
	onOpenSettings: () => void;
	onSave: () => void;
	onTitleChange: (newTitle: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
	title,
	nodeCount,
	zoom,
	saveStatus,
	hasUnsavedChanges,
	isSaving,
	settings,
	onOpenSettings,
	onSave,
	onTitleChange,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [tempTitle, setTempTitle] = useState(title);

	const handleSubmit = () => {
		setIsEditing(false);
		if (tempTitle.trim()) {
			onTitleChange(tempTitle.trim());
		} else {
			setTempTitle(title);
		}
	};

	return (
		<header className='absolute top-3 left-4 right-4 z-30 pointer-events-none flex items-center justify-between'>
			{/* Left Title Unit */}
			<div className='flex flex-col gap-1'>
				<div className='pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-sm bg-[#0e1118]/85 backdrop-blur-md border border-white/[0.08] shadow-xl'>
					<div className='flex items-center gap-2.5 border-r border-white/10 pr-3'>
						<span className='font-mono text-xs font-black tracking-widest text-slate-100 uppercase'>
							NEURO<span className='text-rose-500'>GRAPH</span>
						</span>
					</div>

					<div>
						{isEditing ? (
							<input
								type='text'
								value={tempTitle}
								autoFocus
								onChange={(e) => setTempTitle(e.target.value)}
								onBlur={handleSubmit}
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleSubmit();
									if (e.key === 'Escape') {
										setTempTitle(title);
										setIsEditing(false);
									}
								}}
								className='bg-transparent text-sm font-mono font-bold text-slate-100 border-b border-rose-500 outline-none px-0 py-0.5 tracking-wider w-64'
							/>
						) : (
							<button
								type='button'
								onClick={() => {
									setTempTitle(title);
									setIsEditing(true);
								}}
								className='group flex items-center gap-1.5 text-sm font-mono font-bold text-slate-100 hover:text-rose-400 transition-colors tracking-wider text-left'
							>
								<span>{title}</span>
								<span className='text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 font-normal'>
									[EDIT]
								</span>
							</button>
						)}
					</div>
				</div>
				<span className='text-xs text-white/20'>v{version}</span>
			</div>

			{/* Top Center Warning Indicator for Unsaved Changes */}
			{hasUnsavedChanges && (
				<div className='pointer-events-auto absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-3.5 py-1.5 rounded-sm bg-[#181208]/95 border border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] backdrop-blur-md animate-in fade-in-50 zoom-in-95'>
					<AlertTriangle className='w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0' />
					<span className='font-mono text-xs font-bold text-amber-300 tracking-wider'>
						UNSAVED CHANGES // REMEMBER TO SAVE
					</span>
					<button
						type='button'
						onClick={() => onSave()}
						disabled={isSaving}
						className='ml-1 px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-mono text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow disabled:opacity-50 flex items-center gap-1.5'
						title='Save mindmap (⌘S / Ctrl+S)'
					>
						<span>{isSaving ? 'Saving...' : 'Save Now'}</span>
						<kbd className='px-1 py-0.2 rounded bg-black/20 text-black/80 font-sans text-[9px] font-semibold'>
							⌘S
						</kbd>
					</button>
				</div>
			)}

			{/* Right Telemetry Readout & Settings Trigger */}
			<div className='pointer-events-auto flex items-center gap-2'>
				<button
					type='button'
					onClick={onOpenSettings}
					className='group flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#0e1118]/85 backdrop-blur-md border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.05] shadow-xl font-mono text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer'
					title='Project Settings: Configure default node color & shape'
				>
					<Sliders className='w-3.5 h-3.5 text-rose-400 group-hover:rotate-45 transition-transform duration-200' />
					<span className='font-semibold tracking-wider'>SETTINGS</span>
					{settings && (
						<div className='flex items-center gap-1.5 pl-1.5 border-l border-white/10'>
							<span
								className={cn(
									'w-2 h-2 rounded-full',
									settings.defaultColor === 'cyan' && 'bg-cyan-500',
									settings.defaultColor === 'amber' && 'bg-amber-500',
									settings.defaultColor === 'emerald' && 'bg-emerald-500',
									settings.defaultColor === 'purple' && 'bg-purple-500',
									settings.defaultColor === 'slate' && 'bg-slate-400',
									(!settings.defaultColor || settings.defaultColor === 'red') &&
										'bg-rose-500',
								)}
							/>
							<span className='text-[10px] text-slate-400 uppercase tracking-tight font-medium'>
								{settings.defaultShape === 'circle' ? 'ORB' : 'BOX'}
							</span>
						</div>
					)}
				</button>

				<div className='flex items-center gap-4 px-3 py-1.5 rounded-sm bg-[#0e1118]/85 backdrop-blur-md border border-white/[0.08] shadow-xl font-mono text-[11px] text-slate-400'>
					<div className='flex items-center gap-1.5 border-r border-white/10 pr-3'>
						<Cpu className='w-3.5 h-3.5 text-slate-500' />
						<span className='text-slate-500'>NODES:</span>
						<span className='font-bold text-slate-200'>{nodeCount}</span>
					</div>

					<div className='flex items-center gap-1.5 border-r border-white/10 pr-3'>
						<span className='text-slate-500'>ZOOM:</span>
						<span className='font-bold text-slate-200'>
							{Math.round(zoom * 100)}%
						</span>
					</div>

					<div className='flex items-center gap-1.5'>
						{saveStatus === 'saving' ? (
							<>
								<RefreshCw className='w-3 h-3 text-amber-400 animate-spin' />
								<span className='text-amber-400 font-medium text-[10px]'>
									SAVING...
								</span>
							</>
						) : hasUnsavedChanges ? (
							<>
								<span className='w-2 h-2 rounded-full bg-amber-400 animate-pulse' />
								<span className='text-amber-400 font-medium text-[10px]'>
									UNSAVED
								</span>
							</>
						) : (
							<>
								<CheckCircle2 className='w-3 h-3 text-emerald-400' />
								<span className='text-slate-400 text-[10px]'>JSON SYNCED</span>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
};
