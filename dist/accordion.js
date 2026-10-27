// src/accordion.ts
function getDefaultOpenFolder(controls) {
  return controls.find((control) => control.type === "folder" && (control.defaultOpen ?? true))?.path ?? null;
}
function pruneOpenFolders(openFolders, ids) {
  const kept = Object.entries(openFolders).filter(([id]) => ids.includes(id));
  return kept.length === Object.keys(openFolders).length ? openFolders : Object.fromEntries(kept);
}
function resolveOpenFolder(controls, openFolder) {
  if (openFolder === null) return null;
  if (openFolder !== void 0 && controls.some((control) => control.type === "folder" && control.path === openFolder)) return openFolder;
  return getDefaultOpenFolder(controls);
}
export {
  getDefaultOpenFolder,
  pruneOpenFolders,
  resolveOpenFolder
};
//# sourceMappingURL=accordion.js.map