import { os, StorageKeys, createElement, bindEvent } from "../framework.js";

const BANNER_ID = "tyler-announcement-banner";

export function setAnnouncement(message) {
  const text = String(message || "").trim();
  if (!text) return;
  const record = { message: text, time: Date.now() };
  os.storage.set(StorageKeys.announcement, record);
  renderAnnouncementBanner();
}

export function clearAnnouncement() {
  os.storage.remove(StorageKeys.announcement);
  const existing = document.getElementById(BANNER_ID);
  if (existing) existing.remove();
}

export function renderAnnouncementBanner() {
  const record = os.storage.get(StorageKeys.announcement);
  const existing = document.getElementById(BANNER_ID);
  if (existing) existing.remove();
  if (!record || !record.message) return;

  const banner = createElement("div", { id: BANNER_ID });
  banner.className = "announcement-banner";
  const label = createElement("span", { className: "announcement-banner-text" });
  label.textContent = record.message;
  const close = createElement("button", { className: "announcement-banner-close" });
  close.innerHTML = '<i class="fas fa-xmark"></i>';
  banner.appendChild(createElement("i", { className: "fas fa-bullhorn announcement-banner-icon" }));
  banner.appendChild(label);
  banner.appendChild(close);
  document.body.appendChild(banner);
  bindEvent(close, "click", clearAnnouncement);
}
