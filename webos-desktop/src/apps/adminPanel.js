import "../styles/adminPanel.css";
import { BaseApp, os, ServiceKeys, $, bindEvent, setHTML } from "../framework.js";
import {
  unlockAdmin,
  isAdminUnlocked,
  lockAdmin,
  isAdminTagEnabled,
  setAdminTag,
} from "../shared/adminAccess.js";

const WIN_ID = "admin-panel";
const ADMIN_ICON = "fas fa-user-shield";

export class AdminPanelApp extends BaseApp {
  async open() {
    if (await this.isSingletonOpen(WIN_ID)) return;
    this.win = os.window.create(WIN_ID, "Admin Panel", "460px", "520px", {
      icon: ADMIN_ICON,
    });
    this.render();
  }

  render() {
    if (isAdminUnlocked()) this.renderDashboard();
    else this.renderLock();
  }

  renderLock() {
    setHTML(
      this.win,
      `<div class="admin-panel-root admin-panel-lock">
        <i class="${ADMIN_ICON} admin-panel-lock-icon"></i>
        <h2>Admin Access</h2>
        <p>Enter the admin code to continue.</p>
        <input class="admin-panel-input" type="password" placeholder="Admin code" autocomplete="off" />
        <div class="admin-panel-error"></div>
        <button class="admin-panel-btn admin-panel-btn-primary" data-action="unlock">Unlock</button>
      </div>`,
    );
    const input = $(".admin-panel-input", this.win);
    const submit = () => this.tryUnlock(input.value);
    bindEvent($("[data-action=unlock]", this.win), "click", submit);
    bindEvent(input, "keydown", (event) => {
      if (event.key === "Enter") submit();
    });
    input.focus();
  }

  async tryUnlock(code) {
    if (await unlockAdmin(code)) {
      this.notify("Admin Panel", "Admin access unlocked.");
      this.render();
      return;
    }
    $(".admin-panel-error", this.win).textContent = "Wrong code. Try again.";
  }

  renderDashboard() {
    setHTML(
      this.win,
      `<div class="admin-panel-root">
        <div class="admin-panel-header">
          <h2><i class="${ADMIN_ICON}"></i> Admin Panel</h2>
          <span class="admin-badge">ADMIN</span>
        </div>
        <label class="admin-panel-row">
          <span>Show admin tag on my name</span>
          <input type="checkbox" class="admin-panel-toggle" data-action="tag" ${isAdminTagEnabled() ? "checked" : ""} />
        </label>
        <div class="admin-panel-grid">
          <button class="admin-panel-btn" data-action="announce"><i class="fas fa-bullhorn"></i> Send announcement</button>
          <button class="admin-panel-btn" data-action="tasks"><i class="fas fa-list-check"></i> Task Manager</button>
          <button class="admin-panel-btn" data-action="closeAll"><i class="fas fa-window-close"></i> Close all windows</button>
          <button class="admin-panel-btn" data-action="clearNotes"><i class="fas fa-bell-slash"></i> Clear notifications</button>
          <button class="admin-panel-btn" data-action="reload"><i class="fas fa-rotate"></i> Restart Tyler OS</button>
          <button class="admin-panel-btn admin-panel-btn-danger" data-action="reset"><i class="fas fa-trash"></i> Reset all data</button>
        </div>
        <button class="admin-panel-btn admin-panel-btn-primary" data-action="lock"><i class="fas fa-lock"></i> Lock admin panel</button>
      </div>`,
    );
    this.bindDashboard();
  }

  bindDashboard() {
    const actions = {
      announce: () => this.sendAnnouncement(),
      tasks: () => os.app.launch(ServiceKeys.TASK_MANAGER),
      closeAll: () => os.window.closeAll(),
      clearNotes: () => os.notify.clearAll(),
      reload: () => window.location.reload(),
      reset: () => this.resetAllData(),
      lock: () => {
        lockAdmin();
        this.render();
      },
    };
    Object.entries(actions).forEach(([name, handler]) => {
      bindEvent($(`[data-action=${name}]`, this.win), "click", handler);
    });
    bindEvent($("[data-action=tag]", this.win), "change", (event) =>
      setAdminTag(event.target.checked),
    );
  }

  async sendAnnouncement() {
    const message = await os.dialog.prompt("Announcement", "Message to show:");
    if (!message) return;
    os.notify.send("Announcement", message, { icon: ADMIN_ICON });
  }

  async resetAllData() {
    const confirmed = await os.dialog.confirm(
      "Reset all data",
      "This erases all settings and files on this device. Continue?",
    );
    if (!confirmed) return;
    os.storage.clear();
    indexedDB.databases?.().then((databases) => {
      databases.forEach((db) => indexedDB.deleteDatabase(db.name));
      window.location.reload();
    });
  }
}
