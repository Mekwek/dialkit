// Dependency-free viewport capture.
//
// Clones the page with every element's computed style inlined, swaps canvases,
// videos and images for data URLs, wraps it all in an SVG <foreignObject>, and
// draws that SVG into a canvas. Limits: web fonts fall back to system fonts,
// cross-origin images without CORS render empty, iframes are skipped.

export type CaptureOptions = {
  /** Elements matching this are left out of the capture. */
  ignore: string;
  /** Output pixels per CSS pixel. */
  scale: number;
};

const SKIP_TAGS = new Set(['SCRIPT', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'LINK', 'META']);
const FROZEN = 'animation: none !important; transition: none !important; caret-color: transparent !important;';

export async function rasterizeViewport({ ignore, scale }: CaptureOptions): Promise<HTMLCanvasElement> {
  const width = window.innerWidth;
  const height = window.innerHeight;
  // Read canvases in the frame they were drawn; WebGL clears them afterwards.
  const canvasFrames = await snapshotCanvases(ignore);

  const root = document.documentElement;
  const clone = root.cloneNode(true) as HTMLElement;
  const pairs: [Element, Element][] = [];
  collectPairs(root, clone, pairs);

  const pseudoRules: string[] = [];
  const resources: Promise<void>[] = [];
  let pseudoId = 0;

  for (const [source, copy] of pairs) {
    if (SKIP_TAGS.has(source.tagName) || (source !== root && source.matches(ignore))) {
      copy.remove();
      continue;
    }
    const style = getComputedStyle(source);
    if (style.display === 'none') {
      copy.remove();
      continue;
    }
    let css = inlineStyle(style) + FROZEN;
    // Styles are inlined; drop the page's classes but keep any pseudo hooks.
    copy.removeAttribute('class');

    for (const pseudo of ['::before', '::after'] as const) {
      const ps = getComputedStyle(source, pseudo);
      if (ps.content && ps.content !== 'none' && ps.content !== 'normal') {
        const cls = `dk-capture-${pseudoId++}`;
        copy.classList.add(cls);
        pseudoRules.push(`.${cls}${pseudo}{${inlineStyle(ps)}${FROZEN}}`);
      }
    }

    if (source instanceof HTMLCanvasElement) {
      const img = document.createElement('img');
      img.src = canvasFrames.get(source) ?? '';
      img.setAttribute('style', css);
      copy.replaceWith(img);
      continue;
    }
    if (source instanceof HTMLVideoElement) {
      const img = document.createElement('img');
      img.src = videoFrame(source);
      img.setAttribute('style', css);
      copy.replaceWith(img);
      continue;
    }
    if (source instanceof HTMLImageElement && copy instanceof HTMLImageElement) {
      const src = source.currentSrc || source.src;
      copy.removeAttribute('srcset');
      copy.removeAttribute('loading');
      if (src && !src.startsWith('data:')) {
        resources.push(toDataUrl(src).then((data) => { copy.src = data; }));
      }
    }
    if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement) {
      copy.setAttribute('value', source.value);
      if (copy instanceof HTMLTextAreaElement) copy.textContent = source.value;
    }

    // Background images must be inlined too; the SVG can't fetch anything.
    const urls = [...css.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:'));
    if (urls.length) {
      resources.push(Promise.all(urls.map(async (u) => [u, await toDataUrl(u)] as const)).then((pairs) => {
        for (const [u, data] of pairs) css = css.split(u).join(data);
        copy.setAttribute('style', css);
      }));
    }
    copy.setAttribute('style', css);
  }
  await Promise.all(resources);

  const body = clone.querySelector('body');
  body?.setAttribute('style', `${body.getAttribute('style') ?? ''}; margin-top: ${-window.scrollY}px; margin-left: ${-window.scrollX}px;`);
  clone.querySelectorAll('style').forEach((node) => node.remove());
  const styleEl = document.createElement('style');
  styleEl.textContent = pseudoRules.join('\n');
  clone.querySelector('head')?.append(styleEl);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

  const markup = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${markup}</foreignObject></svg>`;
  const image = new Image();
  image.decoding = 'async';
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = pageBackground();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function collectPairs(source: Element, copy: Element, out: [Element, Element][]) {
  out.push([source, copy]);
  const a = source.children;
  const b = copy.children;
  for (let i = 0; i < a.length; i++) collectPairs(a[i], b[i], out);
}

function inlineStyle(style: CSSStyleDeclaration): string {
  let css = '';
  for (let i = 0; i < style.length; i++) {
    const name = style[i];
    css += `${name}:${style.getPropertyValue(name)};`;
  }
  return css;
}

function snapshotCanvases(ignore: string): Promise<Map<HTMLCanvasElement, string>> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const frames = new Map<HTMLCanvasElement, string>();
      for (const canvas of Array.from(document.querySelectorAll('canvas'))) {
        if (canvas.width === 0 || canvas.height === 0 || canvas.closest(ignore)) continue;
        try {
          const copy = document.createElement('canvas');
          copy.width = canvas.width;
          copy.height = canvas.height;
          copy.getContext('2d')!.drawImage(canvas, 0, 0);
          frames.set(canvas, copy.toDataURL('image/webp', 0.92));
        } catch { /* tainted */ }
      }
      resolve(frames);
    });
  });
}

function videoFrame(video: HTMLVideoElement): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    return canvas.toDataURL('image/webp', 0.9);
  } catch {
    return video.poster || '';
  }
}

const dataUrlCache = new Map<string, Promise<string>>();
function toDataUrl(url: string): Promise<string> {
  let cached = dataUrlCache.get(url);
  if (!cached) {
    cached = fetch(url)
      .then((res) => res.blob())
      .then((blob) => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      }))
      .catch(() => '');
    dataUrlCache.set(url, cached);
  }
  return cached;
}

function pageBackground(): string {
  for (const el of [document.body, document.documentElement]) {
    const color = getComputedStyle(el).backgroundColor;
    if (color && color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return '#ffffff';
}
