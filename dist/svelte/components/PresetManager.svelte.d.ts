import type { Preset } from 'dialkit/store';
type $$ComponentProps = {
    panelId: string;
    presets: Preset[];
    activePresetId: string | null;
    /** What a version is called in the menu: a version (default) or, in a timeline, a sequence. */
    noun?: 'version' | 'sequence';
};
declare const PresetManager: import("svelte").Component<$$ComponentProps, {}, "">;
type PresetManager = ReturnType<typeof PresetManager>;
export default PresetManager;
//# sourceMappingURL=PresetManager.svelte.d.ts.map