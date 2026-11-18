import { os, StorageKeys } from "../framework.js";
import { getAppRegistry } from "../appRegistry.js";
import { formatSize } from "../utils/utils.js";
import { performanceManager } from "../shared/performanceManager.js";
import { animateThemeChange } from "../settings/themeTransition.js";

export function tylerHelpText() {
  return [
    "",
    "  tyler help                      Show this help",
    "",
    "  tyler power <mode>              Set power mode (performance, balanced, high)",
    "  tyler brightness s|set <0-100>  Set brightness level",
    "  tyler brightness get            Show current brightness",
    "  tyler theme <name>              Switch theme",
    "  tyler wallpaper random          Set random wallpaper",
    "",
    "  tyler dnd on|off                Toggle Do Not Disturb",
    "  tyler workspace <n>             Switch to workspace",
    "  tyler workspaces list           List workspaces",
    "",
    "  tyler app list [query]          List apps with optional search",
    "  tyler app uninstall <appId>     Uninstall an app",
    "  tyler app install <appId>       Restore an app",
    "  tyler app disable <appId>       Disable an app",
    "  tyler app enable <appId>        Enable an app",
    "",
    "  tyler notifications clear       Clear all notifications",
    "",
    "  tyler storage report            Storage usage breakdown",
    "",
  ];
}

function powerModes() {
  return { performance: "performance", balanced: "balanced", high: "high" };
}

export async function cmdTyler(terminal, args) {
  if (!args.length) {
    for (const line of tylerHelpText()) await terminal.enqueuePrint(line);
    return;
  }

  const sub = args[0];

  switch (sub) {
    case "help": {
      for (const line of tylerHelpText()) await terminal.enqueuePrint(line);
      break;
    }

    case "power": {
      const mode = args[1];
      if (!mode || !powerModes()[mode]) {
        await terminal.enqueuePrint(
          "Usage: tyler power <performance|balanced|high>",
        );
        break;
      }
      performanceManager.setMode(mode);
      os.events.emit("SETTINGS_CHANGED", { performanceMode: mode });
      await terminal.enqueuePrint(`  Power mode set to: ${mode}`);
      break;
    }

    case "brightness": {
      const sub = args[1];
      if (sub === "s" || sub === "set") {
        const val = parseInt(args[2]);
        if (isNaN(val) || val < 0 || val > 100) {
          await terminal.enqueuePrint("Usage: tyler brightness set <0-100>");
          break;
        }
        os.storage.set(StorageKeys.brightness, val);
        os.events.emit("SETTINGS_CHANGED", { brightness: val });
        document.documentElement.style.setProperty("--brightness", `${val}%`);
        await terminal.enqueuePrint(`  Brightness set to: ${val}%`);
      } else if (sub === "get" || !sub) {
        const current = parseInt(
          os.storage.get(StorageKeys.brightness) || "100",
        );
        await terminal.enqueuePrint(`  Brightness: ${current}%`);
      } else {
        await terminal.enqueuePrint(
          "Usage: tyler brightness s|set <0-100>  |  tyler brightness get",
        );
      }
      break;
    }

    case "theme": {
      const name = args[1];
      if (!name) {
        await terminal.enqueuePrint("Usage: tyler theme <theme-name>");
        break;
      }
      os.storage.set(StorageKeys.theme, name);
      animateThemeChange(() => {
        document.documentElement.setAttribute("data-theme", name);
      });
      os.events.emit("SETTINGS_CHANGED", { theme: name });
      await terminal.enqueuePrint(`  Theme switched to: ${name}`);
      break;
    }

    case "wallpaper": {
      if (args[1] === "random") {
        const count = parseInt(
          os.storage.get(StorageKeys.wallpaperCount) || "20",
        );
        const idx = Math.floor(Math.random() * count);
        os.storage.set(StorageKeys.wallpaperIndexKey, idx);
        os.events.emit("WALLPAPER_CHANGED", { index: idx });
        await terminal.enqueuePrint("  Random wallpaper applied");
      } else {
        await terminal.enqueuePrint("Usage: tyler wallpaper random");
      }
      break;
    }

    case "dnd": {
      const val = args[1];
      if (val === "on" || val === "off") {
        const enabled = val === "on";
        os.storage.set(StorageKeys.dndKey, enabled ? "true" : "false");
        try {
          os.notify.setDoNotDisturb(enabled);
        } catch {}
        os.events.emit("SETTINGS_CHANGED", { dnd: enabled });
        await terminal.enqueuePrint(`  Do Not Disturb: ${val}`);
      } else {
        await terminal.enqueuePrint("Usage: tyler dnd on|off");
      }
      break;
    }

    case "workspace":
    case "workspaces": {
      const wm = terminal.services?.windowManager;
      const wsManager = wm?.workspaceManager;
      if (!wsManager) {
        await terminal.enqueuePrint("  Workspace manager not available");
        break;
      }
      const ws = args[0] === "workspace" ? args[1] : null;
      if (ws && !isNaN(parseInt(ws))) {
        const idx = parseInt(ws);
        const target = wsManager.workspaces.find((w) => w.id === idx);
        if (target) {
          wsManager.switchTo(target.id);
          await terminal.enqueuePrint(
            `  Switched to workspace ${idx} (${target.name})`,
          );
        } else {
          await terminal.enqueuePrint(`  Workspace ${idx} does not exist`);
        }
      } else if (args[1] === "list" || !ws) {
        const workspaces = wsManager.workspaces;
        if (!workspaces.length) {
          await terminal.enqueuePrint("  No workspaces available");
        } else {
          for (const w of workspaces) {
            const active = w.id === wsManager.activeId ? " *" : "";
            await terminal.enqueuePrint(`  ${w.id}. ${w.name}${active}`);
          }
        }
      } else {
        await terminal.enqueuePrint(
          "Usage: tyler workspace <n>  |  tyler workspaces list",
        );
      }
      break;
    }

    case "app": {
      const action = args[1];
      const id = args[2];
      const appRegistry = getAppRegistry();
      const appMap = os.app.getAllApps();

      if (action === "list") {
        const query = args.length > 2 ? args.slice(2).join(" ") : null;
        const allApps = appRegistry.getAllApps(appMap);
        const filtered = query
          ? allApps.filter(
              (a) =>
                a.id.toLowerCase().includes(query) ||
                a.displayName.toLowerCase().includes(query),
            )
          : allApps;

        if (!filtered.length) {
          await terminal.enqueuePrint("  No apps found.");
          break;
        }

        await terminal.enqueuePrint(`  Found ${filtered.length} app(s):`);
        for (const app of filtered) {
          const status = app.protected
            ? "protected"
            : app.uninstalled
              ? "uninstalled"
              : app.disabled
                ? "disabled"
                : "enabled";
          const line = `  ${app.id.padEnd(24)} ${app.displayName.padEnd(20)} [${app.type.padEnd(8)}] [${status}]`;
          await terminal.enqueuePrint(line);
        }
        break;
      }

      if (!id) {
        await terminal.enqueuePrint("Usage:");
        await terminal.enqueuePrint("  tyler app list [query]");
        await terminal.enqueuePrint("  tyler app uninstall <appId>");
        await terminal.enqueuePrint("  tyler app install <appId>");
        await terminal.enqueuePrint("  tyler app disable <appId>");
        await terminal.enqueuePrint("  tyler app enable <appId>");
        break;
      }

      switch (action) {
        case "uninstall": {
          if (appRegistry.isProtected(id)) {
            await terminal.enqueuePrint(
              `  Cannot uninstall protected app: ${id}`,
            );
            break;
          }
          const confirmed = await os.dialog.confirm(
            "Uninstall App",
            `Uninstall "${id}"?`,
          );
          if (confirmed && appRegistry.uninstallApp(id)) {
            await terminal.enqueuePrint(`  Uninstalled: ${id}`);
          }
          break;
        }
        case "install": {
          appRegistry.restoreApp(id);
          await terminal.enqueuePrint(`  Restored: ${id}`);
          break;
        }
        case "disable": {
          if (appRegistry.isProtected(id)) {
            await terminal.enqueuePrint(
              `  Cannot disable protected app: ${id}`,
            );
            break;
          }
          if (appRegistry.setAppDisabled(id, true)) {
            await terminal.enqueuePrint(`  Disabled: ${id}`);
          }
          break;
        }
        case "enable": {
          appRegistry.restoreApp(id);
          if (appRegistry.setAppDisabled(id, false)) {
            await terminal.enqueuePrint(`  Enabled: ${id}`);
          }
          break;
        }
        default:
          await terminal.enqueuePrint(
            `  Unknown subcommand: ${action}. Use: list, uninstall, install, disable, enable`,
          );
      }
      break;
    }

    case "notifications": {
      const action = args[1];
      if (action === "clear") {
        try {
          os.notify.clearAll();
          await terminal.enqueuePrint("  Notifications cleared");
        } catch {
          await terminal.enqueuePrint("  Notification center not available");
        }
      } else {
        await terminal.enqueuePrint("Usage: tyler notifications clear");
      }
      break;
    }

    case "storage": {
      const action = args[1];
      if (action === "report") {
        try {
          const estimate = await navigator.storage.estimate();
          const used = estimate.usage || 0;
          const quota = estimate.quota || 0;
          await terminal.enqueuePrint(`  Storage used: ${formatSize(used)}`);
          await terminal.enqueuePrint(`  Total quota: ${formatSize(quota)}`);
          await terminal.enqueuePrint(
            `  Usage: ${quota > 0 ? Math.round((used / quota) * 100) : "?"}%`,
          );
        } catch {
          await terminal.enqueuePrint("  Storage API not available");
        }
        const files = os.storage.get(StorageKeys.recentFiles) || [];
        await terminal.enqueuePrint(`  Recent files tracked: ${files.length}`);
      } else {
        await terminal.enqueuePrint("Usage: tyler storage report");
      }
      break;
    }

    default: {
      await terminal.enqueuePrint(`tyler: unknown subcommand '${sub}'`);
      await terminal.enqueuePrint("Run 'tyler help' for usage");
    }
  }
}
