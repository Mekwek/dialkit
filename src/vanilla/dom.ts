export interface Mounted<P> {
  update(props: P): void;
  destroy(): void;
}
export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined)
    node.textContent = text;
  if (tag === 'button')
    (node as HTMLButtonElement).type = 'button';
  return node;
}
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, String(value));
  return node;
}
export function icon(paths: string | readonly string[], className = '', viewBox = '0 0 24 24') {
  const node = svg('svg', { class: className, viewBox, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  for (const d of typeof paths === 'string' ? [paths] : paths)
    node.append(svg('path', { d }));
  return node;
}
export function button(title: string, paths: string | readonly string[], onClick: () => void) {
  const node = element('button', 'dialkit-toolbar-add');
  node.title = title;
  node.setAttribute('aria-label', title);
  node.append(icon(paths));
  node.addEventListener('click', onClick);
  return node;
}
