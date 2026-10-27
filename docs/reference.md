# DialKit reference

[Quick start](https://github.com/joshpuckett/dialkit#quick-start) · [Timeline guide](https://github.com/joshpuckett/dialkit/blob/main/docs/timeline.md)

Import APIs and types from the entry for your adapter: `dialkit`, `dialkit/solid`, `dialkit/svelte`, `dialkit/vue`, or `dialkit/vanilla`.

## Controls

A `DialConfig` maps keys to control definitions. Keys become labels, with camelCase converted to words. Nested objects become folders; their values retain the same paths.

### Sliders

```ts
import type { DialConfig } from "dialkit";

const config = {
  radius: [24, 0, 64],       // [default, min, max]
  spacing: [16, 0, 64, 2],   // [default, min, max, step]
  angle: [0, 0, 90, 1, "°"], // [default, min, max, step, unit]
  scale: 1.2,               // Infer the range and step
} satisfies DialConfig;
```

When a tuple omits its step, DialKit uses `0.01` for ranges up to 1, `0.1` up to 10, `1` up to 100, and `10` above 100. Bare numbers use these ranges:

| Starting value | Minimum | Maximum | Step |
| --- | --- | --- | --- |
| 0–1 | 0 | 1 | 0.01 |
| Greater than 1, up to 10 | 0 | Value × 3 | 0.1 |
| Greater than 10, up to 100 | 0 | Value × 3 | 1 |
| Greater than 100 | 0 | Value × 3 | 10 |
| Negative | Value × 3 | −Value × 3 | 1 |

A unit shows after the value in a dimmer tone. Word units such as `s` or `px` get a small gap; signs such as `°`, `×`, or `%` sit against the number. The value stays a plain number.

Click or drag to adjust a slider. Focus it and press Enter to type a value, or hover over its number briefly and click. Values are clamped to the range.

### Text and selects

```ts
import type { DialConfig } from "dialkit";

const config = {
  title: "Hello",
  notes: { type: "text", default: "", placeholder: "Add a note…" },
  layout: {
    type: "select",
    options: [
      { value: "stack", label: "Stacked" },
      { value: "grid", label: "Grid" },
    ],
    default: "stack",
  },
} satisfies DialConfig;
```

Text fields grow up to five lines, then scroll. Enter inserts a line break. Use the explicit `text` form when a string should remain text, including strings that look like colors.

Select options accept strings or `{ value, label }` objects. The default is the first option's value, or `""` for an empty list. Empty selects are disabled.

Set `display: "segmented"` to show a short list in one row instead of a dropdown. With `hideLabel: true`, the options fill the row and the label becomes the group's accessible name. An option's `icon` replaces its text in the row: SVG path data in a 24 × 24 box, as a string or an array of paths. The label remains its accessible name and tooltip.

```ts
const config = {
  ratio: {
    type: "select",
    options: ["1:1", "4:3", { value: "fill", label: "Fill", icon: "M4 4H20V20H4Z" }],
    display: "segmented",
    hideLabel: true,
  },
} satisfies DialConfig;
```

### Colors

```ts
import type { DialConfig } from "dialkit";

const config = {
  accent: "#a78bfa",
  highlight: "oklch(0.7 0.2 145 / 0.8)",
  background: { type: "color", default: "color(display-p3 1 0.35 0.15)" },
} satisfies DialConfig;
```

Hex, RGB, HSL, OKLCH, and Display P3 strings are detected automatically. Hex accepts 3, 4, 6, or 8 digits. Use an explicit color config for `transparent`.

The picker offers Hex, OKLCH, and Display P3 output, with hue and opacity controls. Converting to a smaller gamut reduces chroma while preserving lightness and hue. RGB and HSL text is accepted as entered; subsequent picker edits use hex. Named colors, CSS variables, relative colors, and `calc()` expressions are not parsed.

### Images

```ts
import type { DialConfig } from "dialkit";

const config = {
  cover: {
    type: "image",
    options: [
      { value: "/images/coast.jpg", label: "Coast" },
      { value: "/images/mountains.jpg", label: "Mountains" },
    ],
  },
  avatar: { type: "image" },
} satisfies DialConfig;
```

Options accept URLs or `{ value, label }` objects. `default` selects the initial URL; otherwise the first option is selected. An image control without options starts empty. Removing an image returns `""`.

Upload or drop an image up to 10 MB. DialKit reads it locally as a data URL and sends nothing to a server. Uploaded choices last for the control's lifetime. The selected value can be saved in a preset or persisted, subject to browser storage limits.

### XY pads

```ts
import type { DialConfig } from "dialkit";

const config = {
  position: { type: "pad" },
  timing: {
    type: "pad",
    x: [0.3, 0.1, 1, 0.01],
    y: [0.2, 0, 1, 0.01],
    labels: { x: "Duration", y: "Bounce" },
  },
  spread: {
    type: "pad",
    x: [1, 0.1, 3, 0.01],
    y: [1, 0.1, 3, 0.01],
    labels: { x: "Spread X", y: "Spread Y" },
    hideLabel: true,
    dragLabels: true,
  },
} satisfies DialConfig;
```

Each axis uses `[default, min, max, step?]`. Omitted axes default to `[0, -1, 1, 0.01]`; an explicit tuple without a step divides its range into 200 intervals. Values are clamped and snapped to the step. Labels do not change the returned `{ x, y }` keys.

X increases to the right; Y increases upward. Clicks near grid intersections snap to them. Hold Shift while dragging to lock an axis. Home or a double-click restores the configured defaults; Escape cancels an active drag.

`hideLabel: true` removes the label box beside the axis fields, so the two fields fill the row; the label still names the pad for assistive technology. `dragLabels: true` lets you drag an axis label left or right to change its value by one step per pixel, or ten with Shift; Escape cancels the drag. Clicking the label without dragging still opens the number for typing, and Up/Down arrows in the number step it.

### Anchors

```ts
import type { DialConfig } from "dialkit";

const config = {
  Alignment: {
    position: { type: "anchor", default: { x: "left", y: "top" } },
  },
} satisfies DialConfig;
```

An anchor shows nine positions as a 3 × 3 grid. One click sets both axes and returns `{ x, y }`, where `x` is `"left"`, `"center"`, or `"right"` and `y` is `"top"`, `"center"`, or `"bottom"`. Omitted default axes are `"center"`.

The grid has no label row: its label names it for screen readers, and a folder's title names it on screen.

Arrow keys move the selection one cell at a time; Home and End select the top-left and bottom-right cells. Invalid or missing axes fall back to the default.

### Field rows

```ts
import type { DialConfig } from "dialkit";

const config = {
  scale: {
    _fields: true,
    uniform: false,
    x: [1.25, 0.1, 3, 0.01],
    y: [1.25, 0.1, 3, 0.01],
    z: [1.25, 0.1, 3, 0.01],
  },
} satisfies DialConfig;
```

`_fields: true` shows a folder's numbers side by side, labelled by their keys. The values stay ordinary sliders: `values.scale.x` is a number, and presets and `setValues` work as they do in any folder. Shortcuts assigned to a field's path still adjust it, but the row shows no shortcut hint. A row has no header to fold, so `_collapsed` has no effect on it. A row holds two to four numbers and at most one boolean; any other folder ignores `_fields` and logs a warning.

Drag a field's label to scrub one step per pixel, or ten with Shift. A value is a button: click it, or press Enter or Space on it, to type a value, step it with Up and Down, then press Enter to commit or Escape to cancel. Leaving the field also commits. Values are clamped and snapped to their step.

Once any value in the row, the lock included, differs from its default, a reset appears beside the label. It puts the row's values back to their defaults and hides again; if it had focus, focus moves to the first field.

The boolean is the row's lock. While it is on, editing one field scales every field by the same ratio, so `[1, 2, 0.5]` becomes `[1.5, 3, 0.75]` when X moves to 1.5. When the edited field starts at 0, the others move by the same amount instead. The change stops where the first field reaches its min or max, and dragging back moves it again right away. Values set from code or shortcuts are written as given.

### Transitions

```ts
import type { DialConfig } from "dialkit";

const config = {
  spring: { type: "spring", visualDuration: 0.3, bounce: 0.2 },
  physics: { type: "spring", stiffness: 200, damping: 25, mass: 1 },
  easing: { type: "easing", duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
} satisfies DialConfig;
```

All three definitions open the same transition editor:

| Mode | Parameters |
| --- | --- |
| Easing | Duration, **Intensity**, and four Bézier coordinates; handles can be dragged or edited by keyboard |
| Time | `visualDuration` and `bounce` |
| Physics | `stiffness`, `damping`, and `mass` |

The mode tabs sit above the curve. In Easing mode, the four fields (X1, Y1, X2, Y2) edit the handles directly: drag a field to scrub it, click it to type a value, or use the Up and Down arrows. Typing all four values into one field, such as `0.25, 0.1, 0.25, 1`, sets the whole curve. **Intensity** scales how far both handles reach from their endpoints: 50% is the curve as you left it, 0% is linear, and 100% doubles the reach. It stops where a handle would leave the editable range (X from 0 to 1, Y from -1 to 2), so the curve keeps its shape. Any other edit to the curve becomes the new 50%.

Switching modes restores the previous edits for that mode while the editor remains mounted. The returned type is `TransitionConfig`, a union of `SpringConfig` and `EasingConfig`, because users can switch between them.

The **Presets** folder's header shows the name of the preset in use, or **Custom**. It has two tabs. **Defaults** lists named curves in Easing mode and named springs in Time and Physics; picking a curve keeps the duration. Each built-in preset has a `description`: a short description of how it moves. **Custom** lists the transitions saved with **Save current curve** or **Save current spring**, per mode. Saved transitions are shared by every transition control and stay in memory; when a panel [persists](#persistence) its presets, they are also kept in that panel's storage under `dialkit:transition-presets`. The list scrolls past `--dial-preset-list-height` (156px, four rows) and fades at an edge while more presets sit beyond it. Read or change them from code:

```ts
DialStore.getTransitionPresets();                 // [{ id, name, mode, value }]
DialStore.getDefaultTransitionPresets("easing");  // [{ name, description, value }]
DialStore.saveTransitionPreset(value, "easing");  // saved as "Custom 1", "Custom 2", …
DialStore.deleteTransitionPreset(id);
DialStore.subscribeTransitions(listener);
```

Hovering, focusing, or tapping the **···** in a transition's header slides out **Copy** and **Paste**. Copy takes its value and mode; Paste stays disabled until something is copied, then applies both in any transition control. `DialStore.copyTransition(value, mode)`, `getCopiedTransition()`, and `clearCopiedTransition()` drive the same clipboard from code.

The built-in curves are 12 named ones (Glide, Sweep, Settle, Flip, Natural, Coast, Elastic, Slow, Vive, Anticipate, Snappy Out, Swift Out), then Linear and the classic families: Ease, Sine, Quad, Cubic, Quart, Quint, Expo, Circ, and Back, each In, Out, and In Out. The springs are React Spring's configs, Crisp (its `default`), Gentle, Wobbly, Stiff, Slow, and Molasses, then Buoyant, Elegant, Bob, Fling, Swift, Float, Drift, Snap, and Stern.

### Actions and folders

```tsx
const values = useDialKit("Card", {
  replay: { type: "action", label: "Replay animation" },
  shadow: {
    _collapsed: true,
    blur: [12, 0, 40],
    reset: { type: "action" },
  },
}, {
  onAction(path) {
    if (path === "replay") replayAnimation();
    if (path === "shadow.reset") resetShadow();
  },
});
```

Actions call `onAction` with their full dot path. They are not writable values. Action buttons stack vertically, including inside `ButtonGroup`.

Folders can nest. `_collapsed: true` starts a folder closed; it is UI metadata and is omitted from resolved values. Use `defaultCollapsed` in panel options to close the entire panel.

```tsx
const values = useDialKit("Card", {
  shadow: { _reset: true, blur: [12, 0, 40], spread: [0, 0, 20] },
}, { id: "card" });
```

`_reset: true` shows a reset button beside the folder title while any value inside, nested folders included, differs from its default. It restores only that folder and saves to the active version like any other edit. Clicking it springs the folder's sliders back; sliders inside spring and easing editors move at once. From code, `DialStore.resetFolder("card", "shadow")` resets without the spring, and `DialStore.isFolderChanged("card", "shadow")` reports whether the button shows.

Spring and easing controls draw a folder of their own, and its header gets the same button without `_reset`: it shows once the curve or its mode differs from the default, and restores both. The store methods take the control's path, as in `DialStore.resetFolder("card", "enter")` for an `enter` spring.

## Controllers

Use `useDialKitController` in React and Vue, or `createDialKitController` in Solid, Svelte, and vanilla. Vanilla's `createDialKit` is an alias for its controller factory.

| Member | Behavior |
| --- | --- |
| `values` | Resolved values: object in React/Svelte, accessor in Solid, computed ref in Vue, snapshot getter in vanilla |
| `getValues()` | Read the latest resolved snapshot |
| `setValue(path, value)` | Update one control using a dot path |
| `setValues(values)` | Apply a nested partial object in one update |
| `resetValues()` | Restore current config defaults and clear the active preset |
| `setOpen(open)` | Open or close this panel; opening also reveals its containing root |
| `getOpen()` | Read open state; `undefined` means the root default has not been initialized |

Programmatic edits update the active preset, or the base values when V1 is selected. `setValues` does not trigger actions. Update an XY pad as a pair: `setValue("position", { x: 0.5, y: -0.25 })`.

### Vanilla lifecycle

Vanilla controllers additionally expose:

| Member | Behavior |
| --- | --- |
| `id` | The registered panel ID |
| `subscribe(callback, immediate?)` | Receive snapshots; calls immediately by default and returns an unsubscribe function |
| `updateConfig(config)` | Reconcile new definitions while retaining compatible edits |
| `destroy()` | Release this registration and its subscriptions; safe to call twice |

Snapshots are plain objects. Read them again after updates or use a subscription. Destroying a root removes the UI; destroy its controllers separately to release their registrations.

## Persistence

Pass a stable `id` to reconnect to a panel across mounts. Multiple registrations with the same ID share values. Keep their configs consistent.

`persist: true` saves values, presets, and the active preset to `localStorage` under `dialkit:${id}`. Use the object form to customize storage:

```tsx
const values = useDialKit("Card", { radius: [24, 0, 64] }, {
  id: "card",
  persist: {
    key: "my-app:card",
    storage: "sessionStorage",
    presets: false,
  },
});
```

`storage` defaults to `"localStorage"`; `presets` defaults to `true`. With `presets: false`, only values are persisted. Saved transition presets are shared by every panel, so they are kept under `dialkit:transition-presets` in the storage of each panel that persists presets. Each of those storages keeps its own copy, so saving or deleting a transition updates the storages of the panels persisting presets at that moment. Open state is retained in memory for stable IDs but is never written to storage.

**Save version** saves and selects a new version. Selecting **V1** restores the editable base values. Hover a thumbnail to delete it. **Copy** places the values and a configuration-update instruction on the clipboard. With `versions="menu"` on the root, the toolbar shows the classic version menu instead; it can also rename, lock, delete, and reorder saved versions. A locked version ignores edits and cannot be deleted. Timelines always use the menu, and name new versions **Sequence 2**, **Sequence 3**, and so on.

For custom preset interfaces, use `DialStore.savePreset`, `loadPreset`, `deletePreset`, `renamePreset`, `reorderPresets`, `setPresetLocked`, `getPresets`, `getActivePresetId`, and `clearActivePreset`. `renamePreset(id, null, name)` renames V1.

### Version thumbnails

By default, panels show versions as captured thumbnails with a **Save version** button and a toggle for the all-versions grid. With `persist`, thumbnails are stored under `${key}:thumbnails` in the same storage; otherwise they last for the session. Elements with `data-dialkit-ignore` are left out of captures. Reduced motion skips the capture flight and the grid zoom.

To place the gallery yourself, render `VersionGallery` with a `panelId`, or `mountVersionGallery(host, { panelId })` in vanilla.

## Panel state

`defaultOpen` on the root supplies the initial state. A panel's `defaultCollapsed` overrides it when specified. Use `setOpen` for later changes.

For code that only has a panel ID:

```ts
import { DialStore } from "dialkit";

DialStore.setPanelOpen("card", true);
DialStore.togglePanelOpen("card");
DialStore.getPanelOpen("card");
```

`DialStore.getDefaultValues("card")` returns the panel's config defaults, keyed by path like its values.

`Folder` also accepts controlled `open` and `onOpenChange` (`@open-change` in Vue), or an initial `defaultOpen`. Inline roots fill their container, ignore `position`, and disable collapse-to-icon interaction.

## Keyboard

| Control | Keys |
| --- | --- |
| Panel or folder | Enter or Space toggles the focused header |
| Slider | Arrows adjust one step; Shift + Arrow or Page Up/Down adjusts ten; Home/End goes to the bounds |
| Numeric editor | Enter opens it from a slider; Enter commits, Escape cancels, Tab commits and advances |
| XY pad | Arrows adjust axes; Shift + Arrow adjusts ten steps; Home resets; Escape cancels a drag |
| Anchor | Arrows move the selection one cell in any direction; Home/End selects the top-left/bottom-right cell |
| Field row | Up/Down adjusts one step; Shift + Up/Down or Page Up/Down adjusts ten; Enter commits, Escape cancels |
| Select or preset menu | Enter, Space, or Up/Down opens; arrows, Home/End, and typing navigate; Enter/Space selects; Escape closes |
| Segmented control | Arrows select a segment; Home/End selects the first/last |
| Transition copy and paste | Focusing **···** shows Copy and Paste; Enter or Space toggles them; they sit before it, so Shift + Tab reaches them and Tab moves on; Escape closes |
| Color picker | Tab moves between controls; arrows adjust the focused control; Escape closes |
| Image picker | Arrows move through images; Enter/Space selects; Escape closes |
| Bézier handles | Arrows move by 0.01; Shift + Arrow by 0.1; Escape cancels a drag |
| Bézier fields | Up/Down adjust by 0.01, Shift by 0.1; Enter commits; Escape cancels |

Menus return focus to their trigger on selection or Escape. Tab and Shift + Tab resume the owning panel's tab order.

### Assigned shortcuts

Shortcut keys use control paths, including nested paths such as `"shadow.blur"`:

```ts
const shortcuts = {
  radius: { key: "r", mode: "fine" },
  "shadow.blur": { key: "b", modifier: "alt", interaction: "drag" },
  visible: { key: "v" },
};
```

| Option | Values | Default |
| --- | --- | --- |
| `key` | A trigger key; optional for `scroll-only` | — |
| `modifier` | `"alt"`, `"shift"`, `"meta"` | None |
| `interaction` | `"scroll"`, `"drag"`, `"move"`, `"scroll-only"` | `"scroll"` |
| `mode` | `"fine"`, `"normal"`, `"coarse"` | `"normal"` |

For sliders, hold the key and scroll, drag horizontally, or move the pointer according to `interaction`. `scroll-only` needs no key. Arrow keys also adjust a slider while its assigned key is held. Toggles flip on the assigned key press.

`normal` uses the slider's step. `fine` uses 1% of its range; `coarse` uses 10%. Shortcut badges show the assigned key and interaction. Shortcuts are disabled while an input, button, or keyboard-operated control has focus.

## Custom layouts

Adapters export individual controls, including `Slider`, `Toggle`, `TextControl`, `SelectControl`, `ColorControl`, `ImageControl`, `DialPad`, `AnchorControl`, `TransitionControl`, `Folder`, and `ButtonGroup`. `ControlRenderer` renders a control metadata tree. Keep custom controls inside an element with `class="dialkit-root"` and set `data-theme` to `"system"`, `"light"`, or `"dark"`. Without a `DialRoot` or `DialTimeline` mounted, text fields also show the focus ring when clicked, a clicked folder header keeps the focus, and a slider's number input keeps a fixed width.

In vanilla, each control takes a host element and props:

```js
import { mountSlider } from "dialkit/vanilla";
import "dialkit/vanilla/styles.css";

const host = document.querySelector(".dialkit-root");
const props = { label: "Radius", value: 24, min: 0, max: 64, step: 1, onChange };
const slider = mountSlider(host, props);

function onChange(value) {
  props.value = value;
  slider.update(props);
}

// When removing the control: slider.destroy();
```

The matching component name (`Slider` here) aliases the mount function in vanilla. For global assigned shortcuts in a custom vanilla layout without a root, mount `mountShortcutListener()` and destroy it with the layout.

Vue also exports `vDialKit` for mounting a root with a directive, such as `<aside v-dial-kit="'inline'" />`.

## Types

Types are exported from the same entry as the adapter. TypeScript infers values from inline configs; use `satisfies` to preserve types for a separate config:

```ts
import type { DialConfig, ResolvedValues } from "dialkit";

const config = {
  radius: [24, 0, 64],
  position: { type: "pad" },
} satisfies DialConfig;

type Values = ResolvedValues<typeof config>;
```

The public types include control configs, `TransitionConfig`, `DialKitController`, `DialKitValueUpdates`, `ControlMeta`, `PanelConfig`, and `Preset`. Timeline config and value types are exported alongside them.
