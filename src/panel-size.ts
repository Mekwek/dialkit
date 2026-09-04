/** Include the panel's chrome in explicit border-box heights, independent of host CSS resets. */
export function measurePanelHeight(content: HTMLElement): number {
  const panel = content.parentElement;
  if (!panel) return content.offsetHeight;
  const style = getComputedStyle(panel);
  const chrome = style.boxSizing === 'border-box'
    ? [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth]
      .reduce((total, value) => total + (parseFloat(value) || 0), 0)
    : 0;
  return content.offsetHeight + chrome;
}
