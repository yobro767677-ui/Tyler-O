import { StorageKeys, os } from "../framework.js";

export const CM_STYLES = {
  TYLEROS: "tyleros",
  WIN11: "win11",
};

export function getContextMenuStyle() {
  try {
    const stored = os.storage.get(StorageKeys.contextMenuStyle);
    if (stored === CM_STYLES.WIN11 || stored === CM_STYLES.TYLEROS)
      return stored;
    if (document.documentElement.dataset.win11 !== undefined)
      return CM_STYLES.WIN11;
  } catch {}
  return CM_STYLES.TYLEROS;
}

export function applyContextMenuStyle(style) {
  const normalized =
    style === CM_STYLES.WIN11 ? CM_STYLES.WIN11 : CM_STYLES.TYLEROS;
  document.documentElement.dataset.cmstyle = normalized;
  try {
    os.storage.set(StorageKeys.contextMenuStyle, normalized);
  } catch {}
  return normalized;
}

export function setContextMenuStyle(style) {
  const normalized =
    style === CM_STYLES.WIN11 ? CM_STYLES.WIN11 : CM_STYLES.TYLEROS;
  applyContextMenuStyle(normalized);
  try {
    os.events.emit("context-menu-style-changed", normalized);
  } catch {}
  return normalized;
}
