// src/versions/gallery.ts
import { DialStore as DialStore4 } from "dialkit/store";
import { HINTS, setHint } from "./hints.js";

// src/icons.ts
var ICON_CLOSE = "M6 6L18 18M18 6L6 18";
var ICON_CLIPBOARD = {
  board: "M8 6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7H8V6Z",
  sparkle: "M19.2405 16.1852L18.5436 14.3733C18.4571 14.1484 18.241 14 18 14C17.759 14 17.5429 14.1484 17.4564 14.3733L16.7595 16.1852C16.658 16.4493 16.4493 16.658 16.1852 16.7595L14.3733 17.4564C14.1484 17.5429 14 17.759 14 18C14 18.241 14.1484 18.4571 14.3733 18.5436L16.1852 19.2405C16.4493 19.342 16.658 19.5507 16.7595 19.8148L17.4564 21.6267C17.5429 21.8516 17.759 22 18 22C18.241 22 18.4571 21.8516 18.5436 21.6267L19.2405 19.8148C19.342 19.5507 19.5507 19.342 19.8148 19.2405L21.6267 18.5436C21.8516 18.4571 22 18.241 22 18C22 17.759 21.8516 17.5429 21.6267 17.4564L19.8148 16.7595C19.5507 16.658 19.342 16.4493 19.2405 16.1852Z",
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V11M8 5H7C5.34315 5 4 6.34315 4 8V18C4 19.6569 5.34315 21 7 21H12"
};
var ICON_CLIPBOARD_PLAIN = {
  board: ICON_CLIPBOARD.board,
  body: "M16 5H17C18.6569 5 20 6.34315 20 8V18C20 19.6569 18.6569 21 17 21H7C5.34315 21 4 19.6569 4 18V8C4 6.34315 5.34315 5 7 5H8"
};
var ICON_PLUS = ["M5 12H19M12 5V19"];
var ICON_LOCK = [
  "M6 11H18C18.5523 11 19 11.4477 19 12V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V12C5 11.4477 5.44772 11 6 11Z",
  "M7 11V7a5 5 0 0 1 10 0v4"
];
var ICON_LOCK_OPEN = [
  ICON_LOCK[0],
  "M7 11V7a5 5 0 0 1 9.9-1"
];
var ICON_GRID = [
  "M4 6.5C4 5.11929 5.11929 4 6.5 4H8.5C9.88071 4 11 5.11929 11 6.5V8.5C11 9.88071 9.88071 11 8.5 11H6.5C5.11929 11 4 9.88071 4 8.5V6.5Z",
  "M13 6.5C13 5.11929 14.1193 4 15.5 4H17.5C18.8807 4 20 5.11929 20 6.5V8.5C20 9.88071 18.8807 11 17.5 11H15.5C14.1193 11 13 9.88071 13 8.5V6.5Z",
  "M4 15.5C4 14.1193 5.11929 13 6.5 13H8.5C9.88071 13 11 14.1193 11 15.5V17.5C11 18.8807 9.88071 20 8.5 20H6.5C5.11929 20 4 18.8807 4 17.5V15.5Z",
  "M13 15.5C13 14.1193 14.1193 13 15.5 13H17.5C18.8807 13 20 14.1193 20 15.5V17.5C20 18.8807 18.8807 20 17.5 20H15.5C14.1193 20 13 18.8807 13 17.5V15.5Z"
];

// src/vanilla/dom.ts
function element(tag, className = "", text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== void 0)
    node.textContent = text;
  if (tag === "button")
    node.type = "button";
  return node;
}
function svg(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, String(value));
  return node;
}
function icon(paths, className = "", viewBox = "0 0 24 24") {
  const node = svg("svg", { class: className, viewBox, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" });
  for (const d of typeof paths === "string" ? [paths] : paths)
    node.append(svg("path", { d }));
  return node;
}

// src/versions/appshot.ts
import { DialStore as DialStore2 } from "dialkit/store";

// src/versions/spring.ts
function bakedSpring(easing, duration) {
  const stops = easing.replace(/^linear\(|\)$/g, "").split(",").map((part) => {
    const [value, position] = part.trim().split(/\s+/);
    return { value: parseFloat(value), at: position ? parseFloat(position) / 100 : NaN };
  });
  if (isNaN(stops[0].at)) stops[0].at = 0;
  if (isNaN(stops[stops.length - 1].at)) stops[stops.length - 1].at = 1;
  for (let i = 1; i < stops.length; i++) {
    if (!isNaN(stops[i].at)) continue;
    let j = i;
    while (isNaN(stops[j].at)) j++;
    const step = (stops[j].at - stops[i - 1].at) / (j - i + 1);
    for (let n = i; n < j; n++) stops[n].at = stops[i - 1].at + step * (n - i + 1);
  }
  return {
    easing,
    duration,
    timeAt: (p) => {
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i - 1];
        const b = stops[i];
        if (b.value < p) continue;
        const t = b.value === a.value ? b.at : a.at + (p - a.value) / (b.value - a.value) * (b.at - a.at);
        return Math.max(0, t) * duration;
      }
      return duration;
    }
  };
}
var GALLERY_SPRING = bakedSpring(
  "linear(0, 0.0043, 0.0162 1.83%, 0.0853 4.56%, 0.5106 15.52%, 0.6846 20.99%, 0.7529 23.73%, 0.8258 27.38%, 0.8684 30.12%, 0.9118, 0.9428 37.42%, 0.9686, 0.9842 46.55%, 0.9944, 0.9992 57.5%, 1.0013 64.8%, 1.0002 99.48%)",
  0.4681
);

// src/versions/thumbnails.ts
import { DialStore } from "dialkit/store";

// src/versions/capture.ts
var SKIP_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "NOSCRIPT", "TEMPLATE", "IFRAME", "LINK", "META"]);
var FROZEN = "animation: none !important; transition: none !important; caret-color: transparent !important;";
async function rasterizeViewport({ ignore, scale }) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const canvasFrames = await snapshotCanvases(ignore);
  const root = document.documentElement;
  const clone = root.cloneNode(true);
  const pairs = [];
  collectPairs(root, clone, pairs);
  const pseudoRules = [];
  const resources = [];
  let pseudoId = 0;
  for (const [source, copy] of pairs) {
    if (SKIP_TAGS.has(source.tagName) || source !== root && source.matches(ignore)) {
      copy.remove();
      continue;
    }
    const style = getComputedStyle(source);
    if (style.display === "none") {
      copy.remove();
      continue;
    }
    let css = inlineStyle(style) + FROZEN;
    copy.removeAttribute("class");
    for (const pseudo of ["::before", "::after"]) {
      const ps = getComputedStyle(source, pseudo);
      if (ps.content && ps.content !== "none" && ps.content !== "normal") {
        const cls = `dk-capture-${pseudoId++}`;
        copy.classList.add(cls);
        pseudoRules.push(`.${cls}${pseudo}{${inlineStyle(ps)}${FROZEN}}`);
      }
    }
    if (source instanceof HTMLCanvasElement) {
      const img = document.createElement("img");
      img.src = canvasFrames.get(source) ?? "";
      img.setAttribute("style", css);
      copy.replaceWith(img);
      continue;
    }
    if (source instanceof HTMLVideoElement) {
      const img = document.createElement("img");
      img.src = videoFrame(source);
      img.setAttribute("style", css);
      copy.replaceWith(img);
      continue;
    }
    if (source instanceof HTMLImageElement && copy instanceof HTMLImageElement) {
      const src = source.currentSrc || source.src;
      copy.removeAttribute("srcset");
      copy.removeAttribute("loading");
      if (src && !src.startsWith("data:")) {
        resources.push(toDataUrl(src).then((data) => {
          copy.src = data;
        }));
      }
    }
    if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement) {
      copy.setAttribute("value", source.value);
      if (copy instanceof HTMLTextAreaElement) copy.textContent = source.value;
    }
    const urls = [...css.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]).filter((u) => !u.startsWith("data:"));
    if (urls.length) {
      resources.push(Promise.all(urls.map(async (u) => [u, await toDataUrl(u)])).then((pairs2) => {
        for (const [u, data] of pairs2) css = css.split(u).join(data);
        copy.setAttribute("style", css);
      }));
    }
    copy.setAttribute("style", css);
  }
  await Promise.all(resources);
  const body = clone.querySelector("body");
  body?.setAttribute("style", `${body.getAttribute("style") ?? ""}; margin-top: ${-window.scrollY}px; margin-left: ${-window.scrollX}px;`);
  clone.querySelectorAll("style").forEach((node) => node.remove());
  const styleEl = document.createElement("style");
  styleEl.textContent = pseudoRules.join("\n");
  clone.querySelector("head")?.append(styleEl);
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const markup = new XMLSerializer().serializeToString(clone);
  const svg2 = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${markup}</foreignObject></svg>`;
  const image = new Image();
  image.decoding = "async";
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg2)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = pageBackground();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
function collectPairs(source, copy, out) {
  out.push([source, copy]);
  const a = source.children;
  const b = copy.children;
  for (let i = 0; i < a.length; i++) collectPairs(a[i], b[i], out);
}
function inlineStyle(style) {
  let css = "";
  for (let i = 0; i < style.length; i++) {
    const name = style[i];
    css += `${name}:${style.getPropertyValue(name)};`;
  }
  return css;
}
function snapshotCanvases(ignore) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const frames = /* @__PURE__ */ new Map();
      for (const canvas of Array.from(document.querySelectorAll("canvas"))) {
        if (canvas.width === 0 || canvas.height === 0 || canvas.closest(ignore)) continue;
        try {
          const copy = document.createElement("canvas");
          copy.width = canvas.width;
          copy.height = canvas.height;
          copy.getContext("2d").drawImage(canvas, 0, 0);
          frames.set(canvas, copy.toDataURL("image/webp", 0.92));
        } catch {
        }
      }
      resolve(frames);
    });
  });
}
function videoFrame(video) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/webp", 0.9);
  } catch {
    return video.poster || "";
  }
}
var dataUrlCache = /* @__PURE__ */ new Map();
function toDataUrl(url) {
  let cached = dataUrlCache.get(url);
  if (!cached) {
    cached = fetch(url).then((res) => res.blob()).then((blob) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    })).catch(() => "");
    dataUrlCache.set(url, cached);
  }
  return cached;
}
function pageBackground() {
  for (const el of [document.body, document.documentElement]) {
    const color = getComputedStyle(el).backgroundColor;
    if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return "#ffffff";
}

// src/versions/thumbnails.ts
var BASE_VERSION = "base";
var THUMBNAIL_WIDTH = 720;
var THUMBNAIL_QUALITY = 0.8;
var IGNORE_SELECTOR = ".dialkit-root, .dialkit-version-overlay, [data-dialkit-ignore]";
function versionKey(presetId) {
  return presetId ?? BASE_VERSION;
}
var ThumbnailStoreImpl = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.stale = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Set();
  }
  get(panelId, key) {
    return this.read(panelId)[key];
  }
  getAll(panelId) {
    return this.read(panelId);
  }
  set(panelId, key, thumbnail) {
    this.stale.get(panelId)?.delete(key);
    const next = { ...this.read(panelId), [key]: thumbnail };
    this.write(panelId, next);
  }
  /** The version's values changed since its thumbnail was captured. */
  markStale(panelId, key) {
    let keys = this.stale.get(panelId);
    if (!keys) this.stale.set(panelId, keys = /* @__PURE__ */ new Set());
    keys.add(key);
  }
  isStale(panelId, key) {
    return this.stale.get(panelId)?.has(key) ?? false;
  }
  delete(panelId, key) {
    this.stale.get(panelId)?.delete(key);
    const current2 = this.read(panelId);
    if (!(key in current2)) return;
    const next = { ...current2 };
    delete next[key];
    this.write(panelId, next);
  }
  /** Drop thumbnails whose versions no longer exist. */
  prune(panelId, keys) {
    const current2 = this.read(panelId);
    const keep = new Set(keys);
    if (Object.keys(current2).every((key) => keep.has(key))) return;
    const next = {};
    for (const key of keys) if (current2[key]) next[key] = current2[key];
    this.write(panelId, next);
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  read(panelId) {
    const cached = this.cache.get(panelId);
    if (cached) return cached;
    let parsed = {};
    try {
      const raw = storageFor(panelId)?.getItem(storageKey(panelId));
      if (raw) parsed = JSON.parse(raw);
    } catch {
    }
    this.cache.set(panelId, parsed);
    return parsed;
  }
  write(panelId, value) {
    this.cache.set(panelId, value);
    this.persist(panelId, value);
    this.listeners.forEach((fn) => fn());
  }
  persist(panelId, value) {
    const storage = storageFor(panelId);
    if (!storage) return;
    const entries = Object.entries(value).sort((a, b) => b[1].capturedAt - a[1].capturedAt);
    for (let keep = entries.length; keep >= 0; keep--) {
      try {
        storage.setItem(storageKey(panelId), JSON.stringify(Object.fromEntries(entries.slice(0, keep))));
        return;
      } catch {
      }
    }
  }
};
function storageFor(panelId) {
  const config = DialStore.getPresetStorage(panelId);
  if (!config || typeof window === "undefined") return null;
  try {
    return config.storage === "sessionStorage" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}
function storageKey(panelId) {
  return `${DialStore.getPresetStorage(panelId).key}:thumbnails`;
}
var ThumbnailStore = new ThumbnailStoreImpl();
async function captureViewport() {
  if (typeof window === "undefined") return null;
  try {
    const canvas = await rasterizeViewport({
      ignore: IGNORE_SELECTOR,
      scale: Math.min(window.devicePixelRatio || 1, 2)
    });
    return { canvas, thumbnail: toThumbnail(canvas, window.innerWidth, window.innerHeight) };
  } catch {
    return null;
  }
}
function toThumbnail(canvas, width, height) {
  const scale = Math.min(1, THUMBNAIL_WIDTH / width);
  const out = document.createElement("canvas");
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return {
    src: out.toDataURL("image/webp", THUMBNAIL_QUALITY),
    width,
    height,
    capturedAt: Date.now()
  };
}

// src/versions/appshot.ts
var APPSHOT = {
  shutterFadeIn: 150,
  // ms, ease-in-out
  moveFallbackDelay: 200,
  // ms; the flight starts when the shutter is in, or after this
  imageFadeIn: 180,
  // ms, ease-in, over the opaque shutter
  arcOvershoot: 50,
  // px the path swings past the target, vertically
  sizeBump: 0.06,
  // peak extra size mid-flight
  paddingX: 20,
  // px of shadow room around the flying frame
  paddingTop: 10,
  minCornerRadius: 2,
  landingAt: 0.75,
  // progress at which the real thumbnail shows underneath
  labelAt: 0.95
  // progress at which the thumbnail's label fades in
};
var EASE_IN = "cubic-bezier(0.42, 0, 1, 1)";
var EASE_IN_OUT = "cubic-bezier(0.42, 0, 0.58, 1)";
var lerp = (a, b, t) => a + (b - a) * t;
var clamp01 = (v) => Math.min(1, Math.max(0, v));
function frameAt(source, target, p) {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  const my = ty + (ty < sy ? -1 : 1) * APPSHOT.arcOvershoot;
  const cx = 2 * ((sx + tx) / 2 - 0.25 * sx - 0.25 * tx);
  const cy = 2 * (my - 0.25 * sy - 0.25 * ty);
  const q = 1 - p;
  const x = q * q * sx + 2 * p * q * cx + p * p * tx;
  const y = q * q * sy + 2 * p * q * cy + p * p * ty;
  const swell = 1 + q * Math.sin(Math.PI * p) * APPSHOT.sizeBump;
  const width = lerp(source.width, target.width, p) * swell;
  const height = lerp(source.height, target.height, p) * swell;
  return { x: x - width / 2, y: y - height / 2, width, height };
}
function startAppshot() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const source = { x: 0, y: 0, width: W, height: H };
  const container = layer("dialkit-appshot");
  const shadow = layer("dialkit-appshot-shadow");
  const card = layer("dialkit-appshot-card");
  const shutter = layer("dialkit-appshot-shutter");
  const image = layer("dialkit-appshot-image");
  card.append(shutter, image);
  container.append(shadow, card);
  for (const node of [card, shutter, image]) {
    node.style.width = `${W}px`;
    node.style.height = `${H}px`;
  }
  document.body.append(container);
  const shutterIn = shutter.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: APPSHOT.shutterFadeIn,
    easing: EASE_IN_OUT,
    fill: "forwards"
  });
  const ready = Promise.race([
    shutterIn.finished.catch(() => {
    }),
    new Promise((resolve) => setTimeout(resolve, APPSHOT.moveFallbackDelay))
  ]);
  const cancel = () => container.remove();
  const fly = async (frame, slot, { onLanding, onLabel }) => {
    await ready;
    const rect = slot?.getBoundingClientRect();
    if (!slot || !rect || rect.width === 0) {
      const out = shutter.animate([{ opacity: 1 }, { opacity: 0 }], { duration: APPSHOT.imageFadeIn, easing: EASE_IN, fill: "forwards" });
      await out.finished.catch(() => {
      });
      cancel();
      return;
    }
    const target = {
      x: rect.x - APPSHOT.paddingX,
      y: rect.y - APPSHOT.paddingTop,
      width: rect.width + APPSHOT.paddingX * 2,
      height: rect.height + APPSHOT.paddingTop
    };
    const slotRadius = Math.min(parseFloat(getComputedStyle(slot).borderRadius) || 0, rect.width / 2, rect.height / 2);
    const steps = 48;
    const samples = Array.from({ length: steps + 1 }, (_, i) => {
      const p = i / steps;
      const f = frameAt(source, target, p);
      const padX = Math.min(Math.floor((f.width - 1) / 2), APPSHOT.paddingX * p);
      const padTop = APPSHOT.paddingTop * p;
      const boxW = f.width - padX * 2;
      const boxH = f.height - padTop;
      const k = Math.min(boxW / W, boxH / H);
      const frameRadius = lerp(0, slotRadius, p);
      return {
        p,
        k,
        x: f.x + padX + (boxW - W * k) / 2,
        y: f.y + padTop,
        radius: lerp(frameRadius, Math.max(APPSHOT.minCornerRadius, slotRadius), p),
        fade: clamp01((p - APPSHOT.landingAt) * 4)
      };
    });
    const end = samples[steps];
    shadow.style.width = `${W * end.k}px`;
    shadow.style.height = `${H * end.k}px`;
    shadow.style.borderRadius = `${slotRadius}px`;
    frame.className = "dialkit-appshot-frame";
    image.append(frame);
    container.dataset.flying = "true";
    shutterIn.finish();
    image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: APPSHOT.imageFadeIn, easing: EASE_IN, fill: "forwards" });
    const timing = { duration: GALLERY_SPRING.duration * 1e3, easing: GALLERY_SPRING.easing, fill: "forwards" };
    const flight = card.animate(samples.map((s) => ({
      offset: s.p,
      transform: `translate3d(${s.x}px, ${s.y}px, 0) scale(${s.k})`
    })), timing);
    card.animate(samples.map((s) => ({ offset: s.p, borderRadius: `${s.radius / s.k}px` })), timing);
    shadow.animate(samples.map((s) => ({
      offset: s.p,
      transform: `translate3d(${s.x}px, ${s.y}px, 0) scale(${s.k / end.k})`,
      opacity: s.p * (1 - 0.8 * s.fade)
    })), timing);
    let landed = false;
    let labeled = false;
    const land = () => {
      if (!landed) {
        landed = true;
        onLanding();
      }
    };
    const label = () => {
      land();
      if (!labeled) {
        labeled = true;
        onLabel();
      }
    };
    const landTimer = setTimeout(land, GALLERY_SPRING.timeAt(APPSHOT.landingAt) * 1e3);
    const labelTimer = setTimeout(label, GALLERY_SPRING.timeAt(APPSHOT.labelAt) * 1e3);
    await flight.finished.catch(() => {
    });
    clearTimeout(landTimer);
    clearTimeout(labelTimer);
    label();
    container.remove();
  };
  return { fly, cancel };
}
var ArrivalStoreImpl = class {
  constructor() {
    this.arrivals = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Set();
  }
  get(panelId) {
    return this.arrivals.get(panelId) ?? null;
  }
  set(panelId, arrival) {
    if (arrival) this.arrivals.set(panelId, arrival);
    else this.arrivals.delete(panelId);
    this.listeners.forEach((fn) => fn());
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
};
var ArrivalStore = new ArrivalStoreImpl();
async function saveVersionWithAppshot(panelId, resolveSlot) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const previousKey = versionKey(DialStore2.getActivePresetId(panelId));
  const appshot = reduceMotion ? null : startAppshot();
  const capture = await captureViewport();
  const id = DialStore2.saveNewPreset(panelId);
  if (appshot && capture) ArrivalStore.set(panelId, { key: id, stage: "pending" });
  if (capture) {
    ThumbnailStore.set(panelId, id, capture.thumbnail);
    if (!ThumbnailStore.get(panelId, previousKey) || ThumbnailStore.isStale(panelId, previousKey)) {
      ThumbnailStore.set(panelId, previousKey, capture.thumbnail);
    }
  }
  if (!appshot || !capture) {
    appshot?.cancel();
    return id;
  }
  try {
    await appshot.fly(capture.canvas, await resolveSlot(id), {
      onLanding: () => ArrivalStore.set(panelId, { key: id, stage: "landing" }),
      onLabel: () => ArrivalStore.set(panelId, null)
    });
  } finally {
    ArrivalStore.set(panelId, null);
  }
  return id;
}
function layer(className) {
  const node = document.createElement("div");
  node.className = className;
  node.dataset.dialkitIgnore = "";
  return node;
}

// src/versions/controller.ts
import { DialStore as DialStore3 } from "dialkit/store";

// src/versions/grid.ts
var CARD_RADIUS = 14;
var SETTLE_FADE_MS = 140;
var current = null;
function openVersionGrid(options) {
  current?.close();
  registerSceneProperties();
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let versions = options.versions;
  let activeKey = options.activeKey;
  let focusKey = activeKey;
  let closing = false;
  let animations = [];
  const overlay = element("div", "dialkit-version-overlay");
  overlay.dataset.theme = options.theme ?? "system";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Versions");
  const scroller = element("div", "dialkit-version-overlay-scroll");
  const grid = element("div", "dialkit-version-overlay-grid");
  const close = element("button", "dialkit-version-overlay-close");
  close.setAttribute("aria-label", "Close versions");
  close.append(icon(ICON_CLOSE));
  scroller.append(grid);
  overlay.append(scroller, close);
  const cards = /* @__PURE__ */ new Map();
  const focusCard = (key, opts) => cards.get(key)?.querySelector(".dialkit-version-card-frame")?.focus(opts);
  const render = () => {
    grid.textContent = "";
    cards.clear();
    grid.style.setProperty("--dialkit-version-aspect", String(window.innerWidth / window.innerHeight));
    grid.style.setProperty("--dialkit-version-columns", String(columnsFor(versions.length)));
    for (const version of versions) {
      const card = element("div", "dialkit-version-card");
      card.dataset.key = version.key;
      const frame = element("button", "dialkit-version-card-frame");
      frame.setAttribute("aria-label", version.name);
      if (version.thumbnail) {
        const img = element("img");
        img.src = version.thumbnail.src;
        img.alt = "";
        img.draggable = false;
        img.decoding = "sync";
        frame.append(img);
      }
      const label = element("span", "dialkit-version-card-label");
      label.textContent = version.name;
      label.title = "Double-click to rename";
      label.addEventListener("dblclick", () => editLabel(version.key, label, frame));
      card.append(frame, label);
      frame.addEventListener("click", () => choose(version.key));
      frame.addEventListener("focus", () => {
        focusKey = version.key;
      });
      cards.set(version.key, card);
      grid.append(card);
    }
    reserveDialKitSpace();
  };
  const editLabel = (key, label, frame) => {
    if (closing || !options.onRename) return;
    const previous = versions.find((v) => v.key === key)?.name ?? label.textContent ?? "";
    const input = element("input", "dialkit-version-card-input");
    input.value = previous;
    input.setAttribute("aria-label", "Version name");
    let done = false;
    const end = (save) => {
      if (done) return;
      done = true;
      const name = input.value.trim();
      if (save && name && name !== previous) {
        options.onRename(key, name);
        versions = versions.map((v) => v.key === key ? { ...v, name } : v);
        label.textContent = name;
        frame.setAttribute("aria-label", name);
      }
      input.replaceWith(label);
      frame.focus({ preventScroll: true });
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        end(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        end(false);
      }
    });
    input.addEventListener("blur", () => end(true));
    label.replaceWith(input);
    input.focus();
    input.select();
  };
  const reserveDialKitSpace = () => {
    const panel = document.querySelector('.dialkit-panel:not([data-mode="inline"])');
    const rect = panel?.getBoundingClientRect();
    const gutter = 32;
    scroller.style.paddingRight = "";
    scroller.style.paddingLeft = "";
    if (!rect || rect.width === 0) return;
    if (rect.left > window.innerWidth / 2) scroller.style.paddingRight = `${window.innerWidth - rect.left + gutter}px`;
    else scroller.style.paddingLeft = `${rect.right + gutter}px`;
  };
  const zoomedInto = (key) => {
    const frame = cards.get(key)?.querySelector(".dialkit-version-card-frame");
    if (!frame) return null;
    const prev = grid.style.transform;
    grid.style.transform = "none";
    const home = frame.getBoundingClientRect();
    const origin = grid.getBoundingClientRect();
    grid.style.transform = prev;
    const s = window.innerWidth / home.width;
    const tx = -origin.x - s * (home.x - origin.x);
    const ty = -origin.y - s * (home.y - origin.y);
    return `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
  };
  const animateTo = (transform, scene) => {
    const style = getComputedStyle(grid);
    const from = {
      transform: style.transform === "none" ? "translate3d(0px, 0px, 0) scale(1)" : style.transform,
      scene: parseFloat(getComputedStyle(overlay).getPropertyValue("--dialkit-scene")) || 0,
      radius: style.getPropertyValue("--dialkit-card-radius").trim() || "0px"
    };
    animations.forEach((a) => a.cancel());
    const scale = scaleOf(transform);
    const timing = {
      duration: reduceMotion ? 0 : GALLERY_SPRING.duration * 1e3,
      easing: GALLERY_SPRING.easing,
      fill: "forwards"
    };
    overlay.dataset.animating = "true";
    animations = [
      grid.animate([
        { transform: from.transform, "--dialkit-card-radius": from.radius },
        { transform, "--dialkit-card-radius": `${CARD_RADIUS * scene / scale}px` }
      ], timing),
      overlay.animate([{ "--dialkit-scene": from.scene }, { "--dialkit-scene": scene }], timing)
    ];
    return Promise.all(animations.map((a) => a.finished)).then(
      () => {
        delete overlay.dataset.animating;
      },
      () => {
      }
      // superseded by a newer transition
    );
  };
  const finish = () => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    if (current === handle) current = null;
    const fade = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: reduceMotion ? 0 : SETTLE_FADE_MS,
      easing: "linear",
      fill: "forwards"
    });
    fade.onfinish = () => overlay.remove();
    options.onClose?.();
  };
  const choose = (key) => {
    if (closing) return;
    closing = true;
    overlay.dataset.closing = "true";
    if (key !== activeKey) {
      options.onSelect(key);
      activeKey = key;
    }
    const target = zoomedInto(key);
    if (!target) {
      finish();
      return;
    }
    let done = false;
    const settle = () => {
      if (!done) {
        done = true;
        finish();
      }
    };
    animateTo(target, 0).then(settle);
    setTimeout(settle, GALLERY_SPRING.duration * 750);
  };
  const onKey = (e) => {
    if (e.target instanceof HTMLInputElement && overlay.contains(e.target)) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      choose(activeKey);
      return;
    }
    const columns = columnsFor(versions.length);
    const arrows = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (e.key in arrows) {
      e.preventDefault();
      const index = versions.findIndex((v) => v.key === focusKey);
      const next = versions[Math.max(0, Math.min(versions.length - 1, (index < 0 ? 0 : index) + arrows[e.key]))];
      focusCard(next.key);
    }
  };
  const onResize = () => {
    if (closing) return;
    animations.forEach((a) => a.cancel());
    render();
  };
  close.addEventListener("click", () => choose(activeKey));
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", onResize);
  overlay.style.setProperty("--dialkit-scene", "0");
  overlay.style.visibility = "hidden";
  document.body.append(overlay);
  render();
  const anchor = cards.get(activeKey);
  if (anchor) scroller.scrollTop = Math.max(0, anchor.offsetTop - (scroller.clientHeight - anchor.offsetHeight) / 2);
  const start = zoomedInto(activeKey);
  if (start) {
    grid.style.transform = start;
    grid.style.setProperty("--dialkit-card-radius", "0px");
  }
  overlay.style.visibility = "";
  animateTo("translate3d(0px, 0px, 0) scale(1)", 1).then(() => {
    if (closing) return;
    overlay.style.setProperty("--dialkit-scene", "1");
    grid.style.transform = "";
    grid.style.removeProperty("--dialkit-card-radius");
    animations.forEach((a) => a.cancel());
    animations = [];
  });
  focusCard(activeKey, { preventScroll: true });
  const handle = {
    select: (key) => choose(key),
    dismiss: () => choose(activeKey),
    close: () => {
      if (closing) return;
      closing = true;
      animations.forEach((a) => a.cancel());
      finish();
    },
    update: (next, nextActive) => {
      versions = next;
      activeKey = nextActive;
      for (const version of versions) {
        const img = cards.get(version.key)?.querySelector("img");
        if (img && version.thumbnail && img.src !== version.thumbnail.src) img.src = version.thumbnail.src;
      }
    }
  };
  current = handle;
  return handle;
}
function scaleOf(transform) {
  const match = /scale\(([^)]+)\)/.exec(transform);
  return match ? parseFloat(match[1]) : 1;
}
var registered = false;
function registerSceneProperties() {
  if (registered || typeof CSS === "undefined" || !("registerProperty" in CSS)) return;
  registered = true;
  for (const [name, syntax, initialValue] of [
    ["--dialkit-scene", "<number>", "1"],
    ["--dialkit-card-radius", "<length>", `${CARD_RADIUS}px`]
  ]) {
    try {
      CSS.registerProperty({ name, syntax, inherits: true, initialValue });
    } catch {
    }
  }
}
function columnsFor(count) {
  const width = window.innerWidth;
  const max = width >= 1100 ? 3 : width >= 680 ? 2 : 1;
  return Math.max(1, Math.min(max, Math.max(count, 2)));
}

// src/versions/controller.ts
var SETTLE_DELAY_MS = 900;
function listVersions(panelId) {
  const thumbnails = ThumbnailStore.getAll(panelId);
  const presets = DialStore3.getPresets(panelId);
  return [
    { key: BASE_VERSION, presetId: null, name: DialStore3.getBaseName(panelId), thumbnail: thumbnails[BASE_VERSION] },
    ...presets.map((preset) => ({
      key: preset.id,
      presetId: preset.id,
      name: preset.name,
      locked: preset.locked,
      thumbnail: thumbnails[preset.id]
    }))
  ];
}
function selectVersion(panelId, key) {
  if (key === BASE_VERSION) DialStore3.clearActivePreset(panelId);
  else DialStore3.loadPreset(panelId, key);
}
function renameVersion(panelId, key, name) {
  DialStore3.renamePreset(panelId, key === BASE_VERSION ? null : key, name);
}
function deleteVersion(panelId, key) {
  if (key === BASE_VERSION || DialStore3.getPresets(panelId).find((p) => p.id === key)?.locked) return;
  DialStore3.deletePreset(panelId, key);
  ThumbnailStore.delete(panelId, key);
}
function watchVersionThumbnails(panelId) {
  const activeKey = () => versionKey(DialStore3.getActivePresetId(panelId));
  const valuesOf = () => JSON.stringify(DialStore3.getValues(panelId));
  const comparing = () => DialStore3.getPresets(panelId).length > 0;
  let timer;
  let lastValues = valuesOf();
  let lastKey = activeKey();
  let capturing = null;
  let stopped = false;
  const capture = () => {
    capturing ?? (capturing = (async () => {
      const key = activeKey();
      const values = valuesOf();
      const result = await captureViewport();
      if (!result || stopped || key !== activeKey()) return;
      ThumbnailStore.set(panelId, key, result.thumbnail);
      if (valuesOf() !== values) ThumbnailStore.markStale(panelId, key);
    })().finally(() => {
      capturing = null;
    }));
    return capturing;
  };
  const flush = async () => {
    await capturing;
    const key = activeKey();
    if (!ThumbnailStore.get(panelId, key) || ThumbnailStore.isStale(panelId, key)) await capture();
  };
  const captureMissingSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (stopped || !comparing() || ThumbnailStore.get(panelId, activeKey())) return;
      if (document.querySelector(".dialkit-version-overlay, .dialkit-appshot")) {
        captureMissingSoon();
        return;
      }
      void capture();
    }, SETTLE_DELAY_MS);
  };
  const unsubscribe = DialStore3.subscribe(panelId, () => {
    const values = valuesOf();
    const key = activeKey();
    if (key !== lastKey) captureMissingSoon();
    else if (values !== lastValues) ThumbnailStore.markStale(panelId, key);
    lastValues = values;
    lastKey = key;
  });
  ThumbnailStore.prune(panelId, [BASE_VERSION, ...DialStore3.getPresets(panelId).map((p) => p.id)]);
  ThumbnailStore.markStale(panelId, lastKey);
  captureMissingSoon();
  return {
    flush,
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
    }
  };
}
function openVersionsOverview(panelId, theme, onClose) {
  const key = versionKey(DialStore3.getActivePresetId(panelId));
  const handle = openVersionGrid({
    versions: listVersions(panelId),
    activeKey: key,
    theme,
    onSelect: (next) => selectVersion(panelId, next),
    onRename: (next, name) => renameVersion(panelId, next, name),
    onClose: () => {
      stop();
      onClose?.();
    }
  });
  const stop = ThumbnailStore.subscribe(() => {
    handle.update(listVersions(panelId), versionKey(DialStore3.getActivePresetId(panelId)));
  });
  return handle;
}

// src/versions/gallery.ts
function mountVersionGallery(host, initial) {
  let props = initial;
  let overview = null;
  let opening = false;
  let saving = false;
  let editing = null;
  let switchingTo = null;
  let destroyed = false;
  const root = element("div", "dialkit-versions");
  const actions = element("div", "dialkit-versions-actions");
  const save = element("button", "dialkit-versions-button");
  save.dataset.primary = "true";
  save.append(icon(ICON_PLUS, "", "0 0 24 24"), "Save version");
  setHint(save, HINTS.saveVersion);
  const toggle = element("button", "dialkit-versions-button");
  toggle.dataset.icon = "true";
  const grid = svg("svg", { viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" });
  for (const d of ICON_GRID) grid.append(svg("path", { d }));
  toggle.append(grid);
  setHint(toggle, HINTS.allVersions);
  actions.append(save, toggle);
  const strip = element("div", "dialkit-versions-strip");
  strip.setAttribute("role", "listbox");
  strip.setAttribute("aria-label", "Versions");
  root.append(actions, strip);
  host.prepend(root);
  const thumbs = /* @__PURE__ */ new Map();
  const syncCopy = (disabled) => {
    const panel = root.closest(".dialkit-folder");
    panel?.toggleAttribute("data-version-overview", disabled);
    const copy = panel?.querySelector(".dialkit-toolbar-primary[data-wide]");
    if (copy) copy.disabled = disabled;
  };
  const render = () => {
    const { panelId } = props;
    const versions = listVersions(panelId);
    const activeKey = versionKey(DialStore4.getActivePresetId(panelId));
    const arrival = ArrivalStore.get(panelId);
    const many = versions.length > 1;
    root.dataset.panel = panelId;
    toggle.hidden = !many;
    toggle.setAttribute("aria-pressed", String(!!overview || opening));
    root.toggleAttribute("data-overview", !!overview);
    syncCopy(!!overview);
    save.disabled = !!overview || opening;
    toggle.setAttribute("aria-label", `All versions (${versions.length})`);
    strip.hidden = !many;
    const keys = new Set(versions.map((v) => v.key));
    for (const [key, node] of thumbs) {
      if (!keys.has(key)) {
        removeThumb(node);
        thumbs.delete(key);
      }
    }
    versions.forEach((version, index) => {
      const node = thumbs.get(version.key) ?? createThumb(version.key);
      const frame = node.firstElementChild;
      node.dataset.active = String(version.key === activeKey);
      node.dataset.locked = String(!!version.locked);
      frame.setAttribute("aria-selected", String(version.key === activeKey));
      frame.setAttribute("aria-label", version.name);
      if (arrival?.key === version.key) node.dataset.arrival = arrival.stage;
      else delete node.dataset.arrival;
      const img = frame.querySelector("img");
      if (version.thumbnail && img?.getAttribute("src") !== version.thumbnail.src) {
        const next = img ?? element("img");
        next.alt = "";
        next.draggable = false;
        next.src = version.thumbnail.src;
        if (!img) frame.append(next);
      }
      const label = node.querySelector(".dialkit-version-thumb-label");
      if (label && editing !== version.key) label.textContent = version.name;
      const remove = node.querySelector(".dialkit-version-thumb-delete");
      if (remove) remove.setAttribute("aria-label", `Delete ${version.name}`);
      if (strip.children[index] !== node) strip.insertBefore(node, strip.children[index] ?? null);
    });
  };
  const createThumb = (key) => {
    const node = element("div", "dialkit-version-thumb");
    node.dataset.version = key;
    setHint(node, HINTS.version);
    const frame = element("button", "dialkit-version-thumb-frame");
    frame.setAttribute("role", "option");
    frame.addEventListener("click", () => {
      if (overview) overview.select(key);
      else void switchTo(key);
    });
    const label = element("span", "dialkit-version-thumb-label");
    label.addEventListener("dblclick", () => rename(key, label));
    node.append(frame, label);
    if (key !== versionKey(null)) {
      const remove = element("button", "dialkit-version-thumb-delete");
      remove.append(icon(ICON_CLOSE));
      setHint(remove, HINTS.deleteVersion);
      remove.addEventListener("click", () => deleteVersion(props.panelId, key));
      node.append(remove);
    }
    thumbs.set(key, node);
    return node;
  };
  const removeThumb = (node) => {
    setHint(node, void 0);
    const remove = node.querySelector(".dialkit-version-thumb-delete");
    if (remove) setHint(remove, void 0);
    node.remove();
  };
  const rename = (key, label) => {
    const current2 = listVersions(props.panelId).find((v) => v.key === key)?.name ?? "";
    const input = element("input", "dialkit-version-thumb-label dialkit-version-thumb-input");
    input.value = current2;
    input.setAttribute("aria-label", "Version name");
    editing = key;
    let done = false;
    const end = (commit) => {
      if (done) return;
      done = true;
      editing = null;
      input.replaceWith(label);
      if (commit) renameVersion(props.panelId, key, input.value);
      render();
    };
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") end(true);
      else if (e.key === "Escape") end(false);
    });
    input.addEventListener("blur", () => end(true));
    label.replaceWith(input);
    input.focus();
    input.select();
  };
  const switchTo = async (key) => {
    if (switchingTo !== null) {
      switchingTo = key;
      return;
    }
    if (key === versionKey(DialStore4.getActivePresetId(props.panelId))) return;
    switchingTo = key;
    await watcher.flush();
    const next = switchingTo;
    switchingTo = null;
    if (!destroyed) selectVersion(props.panelId, next);
  };
  save.addEventListener("click", async () => {
    if (saving || overview || opening) return;
    saving = true;
    try {
      await saveVersionWithAppshot(props.panelId, async (key) => {
        await new Promise(requestAnimationFrame);
        const slot = thumbs.get(key)?.querySelector(".dialkit-version-thumb-frame") ?? null;
        slot?.scrollIntoView({ block: "nearest", inline: "nearest" });
        return slot;
      });
    } finally {
      saving = false;
    }
  });
  toggle.addEventListener("click", async () => {
    if (overview) {
      overview.dismiss();
      return;
    }
    if (opening) return;
    opening = true;
    render();
    await watcher.flush();
    opening = false;
    if (destroyed) return;
    overview = openVersionsOverview(props.panelId, props.theme, () => {
      overview = null;
      render();
    });
    render();
  });
  const syncAspect = () => root.style.setProperty("--dialkit-version-aspect", String(window.innerWidth / window.innerHeight));
  syncAspect();
  window.addEventListener("resize", syncAspect);
  let watcher = watchVersionThumbnails(props.panelId);
  let stopStore = DialStore4.subscribe(props.panelId, render);
  const stopThumbnails = ThumbnailStore.subscribe(render);
  const stopArrivals = ArrivalStore.subscribe(render);
  render();
  return {
    update(next) {
      if (next.panelId !== props.panelId) {
        watcher.stop();
        stopStore();
        thumbs.forEach(removeThumb);
        thumbs.clear();
        watcher = watchVersionThumbnails(next.panelId);
        stopStore = DialStore4.subscribe(next.panelId, render);
      }
      props = next;
      render();
    },
    destroy() {
      destroyed = true;
      overview?.close();
      syncCopy(false);
      watcher.stop();
      stopStore();
      stopThumbnails();
      stopArrivals();
      window.removeEventListener("resize", syncAspect);
      thumbs.forEach(removeThumb);
      setHint(save, void 0);
      setHint(toggle, void 0);
      root.remove();
    }
  };
}
export {
  mountVersionGallery
};
//# sourceMappingURL=version-gallery.js.map