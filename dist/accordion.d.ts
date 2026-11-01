import { C as ControlMeta, P as PanelConfig } from './DialStore-CDYWklsr.js';
import './dial-pad.js';
import './anchor.js';
import './background.js';

declare function isAccordionPanel(panel: Pick<PanelConfig, 'folderMode'>, rootAccordion: boolean): boolean;
declare function getDefaultOpenFolder(controls: ControlMeta[]): string | null;
declare function pruneOpenFolders(openFolders: Record<string, string | null>, ids: string[]): Record<string, string | null>;
declare function resolveOpenFolder(controls: ControlMeta[], openFolder: string | null | undefined): string | null;

export { getDefaultOpenFolder, isAccordionPanel, pruneOpenFolders, resolveOpenFolder };
