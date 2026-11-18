import { os, StorageKeys } from "../framework.js";

const ADMIN_CODE_HASH =
  "7522b9f3521a73a413cccd8c42b6d5848aefc6fbc369292bbacac2ea9b1061ba";
const ADMIN_TAG_CLASS = "admin-tag-enabled";

async function hashCode(code) {
  const bytes = new TextEncoder().encode(String(code));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function unlockAdmin(code) {
  const isValid = (await hashCode(code)) === ADMIN_CODE_HASH;
  if (isValid) os.storage.set(StorageKeys.adminUnlocked, "true");
  return isValid;
}

export function isAdminUnlocked() {
  return os.storage.get(StorageKeys.adminUnlocked) === "true";
}

export function lockAdmin() {
  os.storage.remove(StorageKeys.adminUnlocked);
  setAdminTag(false);
}

export function isAdminTagEnabled() {
  return isAdminUnlocked() && os.storage.get(StorageKeys.adminTag) === "true";
}

export function setAdminTag(enabled) {
  os.storage.set(StorageKeys.adminTag, String(Boolean(enabled)));
  applyAdminTag();
}

export function applyAdminTag() {
  document.documentElement.classList.toggle(
    ADMIN_TAG_CLASS,
    isAdminTagEnabled(),
  );
}
