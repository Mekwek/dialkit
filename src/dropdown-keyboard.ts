import { getDialKitPortalRoot, getDropdownPosition, observeDropdownPosition } from './dropdown-position';
import { adjacentTabStop, optionKeyIndex } from './control-keyboard';

let dropdownId = 0;

/** Shared focus/selection behavior; framework adapters continue to own values and rendering. */
export function observeDropdownKeyboard(trigger: HTMLElement, getPopup: () => HTMLElement | null | undefined, close: () => void, kind: 'select' | 'presets' | 'help' = 'select'): () => void {
  let frame = 0;
  let dispose: (() => void) | undefined;
  let stopped = false;
  const connect = () => {
    if (stopped) return;
    const popup = getPopup();
    if (!popup?.isConnected) { frame = requestAnimationFrame(connect); return; }
    popup.inert = false;
    popup.removeAttribute('aria-hidden');
    popup.id ||= `dialkit-dropdown-${++dropdownId}`;
    popup.setAttribute('role', kind === 'select' ? 'listbox' : kind === 'presets' ? 'menu' : 'dialog');
    popup.setAttribute('aria-label', trigger.getAttribute('aria-label') || trigger.querySelector('.dialkit-select-label')?.textContent?.trim() || trigger.getAttribute('title') || trigger.textContent?.trim() || 'Options');
    popup.tabIndex = -1;
    trigger.setAttribute('aria-controls', popup.id);

    const selector = kind === 'select' ? '.dialkit-select-option' : '.dialkit-preset-name, .dialkit-preset-delete';
    let active: HTMLElement | undefined;
    let activeIndex = 0;
    let query = '';
    let typedAt = 0;
    let leaving = false;
    const items = () => Array.from(popup.querySelectorAll<HTMLElement>(selector)).filter(el => !el.hasAttribute('disabled'));
    const focusItem = (index: number) => {
      const options = items();
      activeIndex = Math.max(0, Math.min(options.length - 1, index));
      active = options[activeIndex];
      (active ?? popup).focus({ preventScroll: true });
      active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const refresh = () => {
      if (trigger.matches(':disabled')) {
        leaving = true;
        const previous = adjacentTabStop(trigger, true);
        close();
        queueMicrotask(() => previous?.focus());
        return;
      }
      const options = items();
      options.forEach(el => {
        el.tabIndex = -1;
        el.setAttribute('role', kind === 'select' ? 'option' : el.classList.contains('dialkit-preset-delete') ? 'menuitem' : 'menuitemradio');
        if (kind === 'select') el.setAttribute('aria-selected', el.dataset.selected ?? 'false');
        else if (el.classList.contains('dialkit-preset-name')) el.setAttribute('aria-checked', el.parentElement?.dataset.active ?? 'false');
      });
      // Re-home focus after the focused item is removed (a delete), but never
      // steal it from an editor the popup opened itself (an inline rename).
      if (active && !active.isConnected && !leaving && !popup.contains(document.activeElement)) focusItem(activeIndex);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(popup, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-active', 'data-selected'] });

    const restore = () => { leaving = true; trigger.focus({ preventScroll: true }); };
    const keydown = (event: KeyboardEvent) => {
      if (event.altKey || event.metaKey || event.ctrlKey || event.isComposing) return;
      // Text fields inside the popup (an inline rename) own their own keys.
      if ((event.target as HTMLElement).matches('input, textarea')) return;
      if (event.key === 'Tab') {
        // Resume the normal document tab order at the owning control, not at its portal.
        const next = adjacentTabStop(trigger, event.shiftKey);
        restore(); close();
        if (next) { event.preventDefault(); event.stopPropagation(); queueMicrotask(() => next.focus()); }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); restore(); close(); return;
      }
      const options = items();
      const index = options.indexOf(document.activeElement as HTMLElement);
      const next = optionKeyIndex(event.key, Math.max(0, index), options.length);
      if (next !== undefined) {
        event.preventDefault(); event.stopPropagation(); focusItem(next); return;
      }
      if (['Enter', ' '].includes(event.key) && index >= 0) {
        event.preventDefault(); event.stopPropagation(); options[index].click(); return;
      }
      if (event.key.length === 1 && event.key !== ' ') {
        const now = Date.now();
        query = now - typedAt < 700 ? query + event.key.toLocaleLowerCase() : event.key.toLocaleLowerCase();
        typedAt = now;
        const search = [...query].every(c => c === query[0]) ? query[0] : query;
        for (let offset = search.length > 1 ? 0 : 1; offset <= options.length; offset++) {
          const candidate = (Math.max(0, index) + offset) % options.length;
          if (options[candidate]?.textContent?.trim().toLocaleLowerCase().startsWith(search)) {
            focusItem(candidate); break;
          }
        }
        event.preventDefault(); event.stopPropagation();
      }
    };
    const click = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest(selector);
      if (target && !target.classList.contains('dialkit-preset-delete')) restore();
    };
    const focusin = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!leaving && !popup.contains(target) && !trigger.contains(target)) { leaving = true; close(); }
    };
    popup.addEventListener('keydown', keydown);
    popup.addEventListener('click', click, true);
    document.addEventListener('focusin', focusin);

    // Older preset/help portals live under body; inherit the owner's theme and position.
    let stopPosition: (() => void) | undefined;
    if (kind !== 'select') {
      const root = getDialKitPortalRoot(trigger);
      if (root) {
        popup.dataset.theme = root.dataset.theme ?? 'dark';
        const styles = getComputedStyle(root);
        for (const property of Array.from(styles)) {
          if (property.startsWith('--dial-')) popup.style.setProperty(property, styles.getPropertyValue(property));
        }
      }
      const position = () => {
        const pos = getDropdownPosition(trigger, root ?? document.body, { fixed: true, dropdownHeight: popup.scrollHeight + 2, width: kind === 'help' ? 280 : trigger.getBoundingClientRect().width });
        Object.assign(popup.style, { position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px`, right: 'auto', maxHeight: `${pos.maxHeight}px` });
        // A preset menu that declares its own max-width grows for long names,
        // from the trigger width up to that cap; every other popup matches the trigger.
        if (kind === 'presets' && popup.style.maxWidth) Object.assign(popup.style, { width: 'auto', minWidth: `${pos.width}px` });
        else Object.assign(popup.style, { width: `${pos.width}px`, minWidth: '0' });
      };
      stopPosition = observeDropdownPosition(trigger, position, () => popup);
    }
    const selected = items().findIndex(el => el.dataset.selected === 'true' || (el.classList.contains('dialkit-preset-name') && el.parentElement?.dataset.active === 'true'));
    focusItem(Math.max(0, selected));
    dispose = () => {
      leaving = true;
      if (popup.contains(document.activeElement)) trigger.focus({ preventScroll: true });
      popup.inert = true;
      popup.setAttribute('aria-hidden', 'true');
      observer.disconnect(); stopPosition?.();
      popup.removeEventListener('keydown', keydown);
      popup.removeEventListener('click', click, true);
      document.removeEventListener('focusin', focusin);
      trigger.removeAttribute('aria-controls');
    };
  };
  frame = requestAnimationFrame(connect);
  return () => { stopped = true; cancelAnimationFrame(frame); dispose?.(); };
}
