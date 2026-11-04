// src/pictures.ts
var ACTION_SEPARATOR = ":";
var PICK = "pick";
function pictureAction(path, id) {
  return `${path}${ACTION_SEPARATOR}${PICK}${ACTION_SEPARATOR}${id}`;
}
function parsePictureAction(path, action) {
  const prefix = `${path}${ACTION_SEPARATOR}${PICK}${ACTION_SEPARATOR}`;
  if (!action.startsWith(prefix) || action.length === prefix.length) return null;
  return { id: action.slice(prefix.length) };
}
function findPictureFamily(families, id) {
  if (id === null) return null;
  return families.find((family) => family.items.some((item) => item.id === id))?.id ?? null;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var nonEmpty = (value) => typeof value === "string" && value !== "";
function normalizePictureFamilies(value) {
  if (!Array.isArray(value)) return [];
  const familyIds = /* @__PURE__ */ new Set();
  const itemIds = /* @__PURE__ */ new Set();
  const families = [];
  for (const raw of value) {
    if (!isRecord(raw) || !nonEmpty(raw.id) || typeof raw.label !== "string" || familyIds.has(raw.id)) continue;
    familyIds.add(raw.id);
    const items = [];
    for (const rawItem of Array.isArray(raw.items) ? raw.items : []) {
      if (!isRecord(rawItem) || !nonEmpty(rawItem.id) || typeof rawItem.label !== "string" || itemIds.has(rawItem.id)) continue;
      itemIds.add(rawItem.id);
      const item = { id: rawItem.id, label: rawItem.label };
      if (nonEmpty(rawItem.hint)) item.hint = rawItem.hint;
      items.push(item);
    }
    const family = { id: raw.id, label: raw.label, items };
    if (nonEmpty(raw.hint)) family.hint = raw.hint;
    families.push(family);
  }
  return families;
}
function normalizePicturesValue(value) {
  return nonEmpty(value) ? value : null;
}

// src/store/PictureHost.ts
var STATE_KEY = /* @__PURE__ */ Symbol.for("dialkit.pictureHost");
function state() {
  const scope = globalThis;
  let current = scope[STATE_KEY];
  if (!current) {
    current = { host: {}, listeners: /* @__PURE__ */ new Set(), family: null, familyListeners: /* @__PURE__ */ new Set() };
    scope[STATE_KEY] = current;
  }
  return current;
}
function setPictureHost(host) {
  const current = state();
  current.host = { ...host };
  current.listeners.forEach((listener) => listener());
}
function getPictureHost() {
  return state().host;
}
function subscribePictureHost(listener) {
  const listeners = state().listeners;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function showPictureFamily(id) {
  const current = state();
  current.family = id;
  current.familyListeners.forEach((listener) => listener());
}
function getShownPictureFamily() {
  return state().family;
}
function subscribePictureFamily(listener) {
  const listeners = state().familyListeners;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export {
  findPictureFamily,
  getPictureHost,
  getShownPictureFamily,
  normalizePictureFamilies,
  normalizePicturesValue,
  parsePictureAction,
  pictureAction,
  setPictureHost,
  showPictureFamily,
  subscribePictureFamily,
  subscribePictureHost
};
//# sourceMappingURL=picture-api.js.map