import { C as ControlMeta } from './DialStore-CP5O0S4u.js';
import './dial-pad.js';
import './anchor.js';
import './background.js';

declare function getDefaultOpenFolder(controls: ControlMeta[]): string | null;
declare function pruneOpenFolders(openFolders: Record<string, string | null>, ids: string[]): Record<string, string | null>;
declare function resolveOpenFolder(controls: ControlMeta[], openFolder: string | null | undefined): string | null;

export { getDefaultOpenFolder, pruneOpenFolders, resolveOpenFolder };
