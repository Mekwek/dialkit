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
function familyAfterSelection(families, open, before, after) {
  if (after === before) return open;
  return findPictureFamily(families, after) ?? open;
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
export {
  familyAfterSelection,
  findPictureFamily,
  normalizePictureFamilies,
  normalizePicturesValue,
  parsePictureAction,
  pictureAction
};
//# sourceMappingURL=pictures.js.map