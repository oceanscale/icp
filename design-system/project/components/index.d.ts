import type * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'confirm' | 'quiet'; size?: 'md' | 'sm' }
export declare function Button(props: ButtonProps): React.ReactElement;

export interface StampProps { tone?: 'blue' | 'green' | 'ink' | 'danger'; tilt?: boolean; className?: string; children?: React.ReactNode }
export declare function Stamp(props: StampProps): React.ReactElement;

export interface FolderTab { id: string; label: string; code?: string; done?: boolean; locked?: boolean }
export interface FolderTabsProps { tabs: FolderTab[]; active?: string; onChange?: (id: string) => void; label?: string; idBase?: string; className?: string; children?: React.ReactNode }
export declare function FolderTabs(props: FolderTabsProps): React.ReactElement;

export interface CaseFileProps { caseNo?: string; title?: React.ReactNode; subtitle?: React.ReactNode; aside?: React.ReactNode; clip?: boolean; className?: string; children?: React.ReactNode }
export declare function CaseFile(props: CaseFileProps): React.ReactElement;

export interface PolaroidProps { src?: string; alt?: string; caption?: React.ReactNode; pendingLabel?: string; width?: number | string; tilt?: boolean; className?: string }
export declare function Polaroid(props: PolaroidProps): React.ReactElement;

export interface IcpField { label: string; value: React.ReactNode }
export interface IcpFileProps { name: React.ReactNode; summary?: React.ReactNode; kicker?: string; fields?: IcpField[]; photo?: string; photoAlt?: string; caption?: React.ReactNode; pendingLabel?: string; stamp?: { text: string; tone?: StampProps['tone'] }; className?: string; children?: React.ReactNode }
export declare function IcpFile(props: IcpFileProps): React.ReactElement;

export interface ChecklistItem { id: string; label: React.ReactNode; hint?: React.ReactNode; done?: boolean; auto?: boolean; disabled?: boolean; meta?: React.ReactNode }
export interface ChecklistProps { title?: React.ReactNode; items: ChecklistItem[]; onToggle?: (id: string, done: boolean) => void; unit?: string; className?: string }
export declare function Checklist(props: ChecklistProps): React.ReactElement;

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: React.ReactNode; error?: React.ReactNode; multiline?: boolean; rows?: number }
export declare function Field(props: FieldProps): React.ReactElement;

export interface FunnelColumnProps { name: string; code?: string; count?: number; rate?: string; className?: string; children?: React.ReactNode }
export declare function FunnelColumn(props: FunnelColumnProps): React.ReactElement;

export interface LeadCardProps { name: React.ReactNode; company?: React.ReactNode; value?: React.ReactNode; days?: number; late?: boolean; tag?: string; tagTone?: 'green' | 'danger'; className?: string }
export declare function LeadCard(props: LeadCardProps): React.ReactElement;

export interface CreativeCardProps { week?: string; platform?: 'Meta' | 'Google' | 'LinkedIn' | 'TikTok' | string; placement?: string; status?: string; format?: string; ratio?: '1:1' | '4:5' | '9:16' | '1.91:1' | '16:9'; stage?: 'Topo' | 'Meio' | 'Fundo' | string; focus?: string; headline?: React.ReactNode; copy?: string; cta?: string; brief?: React.ReactNode; className?: string; children?: React.ReactNode }
export declare function CreativeCard(props: CreativeCardProps): React.ReactElement;

export interface NoteProps { title?: string; pin?: 'blue' | 'green'; tilt?: boolean; className?: string; children?: React.ReactNode }
export declare function Note(props: NoteProps): React.ReactElement;

export interface ClueStep { id?: string; label: string; state?: 'done' | 'current' | 'locked'; code?: string; active?: boolean; bonus?: boolean }
export interface ClueTrackProps { steps: ClueStep[]; title?: string; level?: string; xp?: number; nextXp?: number | null; onStep?: (id: string | number) => void; className?: string }
export declare function ClueTrack(props: ClueTrackProps): React.ReactElement;

export interface ReadoutProps { label: string; value: React.ReactNode; unit?: string; hint?: React.ReactNode; tone?: 'blue' | 'green' | 'danger'; flag?: string; className?: string }
export declare function Readout(props: ReadoutProps): React.ReactElement;

declare global { interface Window { Dossie: { Button: typeof Button; Stamp: typeof Stamp; FolderTabs: typeof FolderTabs; CaseFile: typeof CaseFile; Polaroid: typeof Polaroid; IcpFile: typeof IcpFile; Checklist: typeof Checklist; Field: typeof Field; FunnelColumn: typeof FunnelColumn; LeadCard: typeof LeadCard; CreativeCard: typeof CreativeCard; Note: typeof Note; ClueTrack: typeof ClueTrack; Readout: typeof Readout } } }
