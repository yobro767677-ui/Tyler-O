import { StorageKeys, os } from "./framework.js";
import logoImg from "./assets/logo.png";
import "./styles/bootScreen.css";
import gsap from "gsap";
import {
  $,
  $$,
  bindEvent,
  createElement,
  setStyle,
  addClass,
} from "./shared/domUtils.js";
import { parseBool } from "./utils/utils.js";
import { isFunction } from "./shared/functionUtils.js";
import { MODES, MODE_DEFS } from "./modeManager.js";
import {
  showWin11BootScreenHold,
  fadeOutWin11BootScreen,
} from "./modes/win11/Win11BootScreen.js";

const BRAND = "Tyler OS";
const MIN_DURATION = 2500;
const WIN11_SESSION_NAME = MODE_DEFS[MODES.WIN11].label;
const WIN11_BLACKOUT_MIN_DURATION = 600;

function isWin11SessionSelected() {
  try {
    return os.storage.get(StorageKeys.selectedSession) === WIN11_SESSION_NAME;
  } catch {
    return false;
  }
}

function createWin11LaunchBoot() {
  const skippingLogo = Boolean(
    os.storage.get(StorageKeys.win11SkipStartupBoot),
  );
  const startedAt = performance.now();
  const pending = showWin11BootScreenHold({
    phase: skippingLogo ? "blackout" : "logo",
  });
  const minDuration = skippingLogo ? WIN11_BLACKOUT_MIN_DURATION : MIN_DURATION;
  return {
    hide: () => {
      const elapsed = performance.now() - startedAt;
      const delay = Math.max(0, minDuration - elapsed);
      return new Promise((resolve) => {
        setTimeout(() => {
          fadeOutWin11BootScreen();
        }, delay);
        pending.then(resolve);
      });
    },
  };
}

export function showBootScreen() {
  const raw = os.storage.get(StorageKeys.disableBootScreen);
  if (!parseBool(raw) && isWin11SessionSelected()) {
    return createWin11LaunchBoot();
  }
  return { hide: () => Promise.resolve() };
}

export function runLoopingBootPreview(anim) {
  const lettersHTML = BRAND.split("")
    .map(
      (ch) => `<span class="boot-letter">${ch === " " ? "\u00A0" : ch}</span>`,
    )
    .join("");

  const div = createElement("div", { className: "boot-overlay" });
  div.innerHTML = `
    <div class="boot-container">
      <div class="boot-logo-wrap">
        <img class="boot-logo" src="${logoImg}" alt="${BRAND}" fetchpriority="high" />
        <div class="boot-brand">${lettersHTML}</div>
      </div>
    </div>
    <div class="boot-skip-hint">Click or Esc to close preview</div>
  `;
  div.style.opacity = "1";
  document.body.appendChild(div);

  const extEls = anim.createExtra ? anim.createExtra(div) || {} : {};
  const container = $(".boot-container", div);
  const logo = $(".boot-logo", div);
  const letters = $$(".boot-letter", div);
  const version = createElement("div", { styles: { display: "none" } });
  div.appendChild(version);
  const els = { overlay: div, container, logo, letters, version, extEls };

  let stopped = false;
  let currentTl = null;
  let timer = 0;

  const play = () => {
    if (stopped) return;
    if (gsap && isFunction(gsap.to)) {
      anim.setup(els);
      currentTl = gsap.timeline({
        onComplete: () => {
          timer = setTimeout(play, 900);
        },
      });
      anim.show(currentTl, els);
    } else {
      addClass(div, "boot-visible");
    }
  };
  play();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    if (currentTl && currentTl.kill) currentTl.kill();
    document.removeEventListener("keydown", onKey, true);
    div.remove();
  };
  const onKey = (e) => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      stop();
    }
  };
  document.addEventListener("keydown", onKey, true);
  bindEvent(div, "click", stop);
  return stop;
}

export function runBootPreview(anim, onDone) {
  const lettersHTML = BRAND.split("")
    .map(
      (ch) => `<span class="boot-letter">${ch === " " ? "\u00A0" : ch}</span>`,
    )
    .join("");

  const div = createElement("div", { className: "boot-overlay" });
  div.innerHTML = `
    <div class="boot-container">
      <div class="boot-logo-wrap">
        <img class="boot-logo" src="${logoImg}" alt="${BRAND}" fetchpriority="high" />
        <div class="boot-brand">${lettersHTML}</div>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  const extEls = anim.createExtra ? anim.createExtra(div) || {} : {};
  const container = $(".boot-container", div);
  const logo = $(".boot-logo", div);
  const letters = $$(".boot-letter", div);
  const version = createElement("div", { styles: { display: "none" } });
  div.appendChild(version);
  const els = { overlay: div, container, logo, letters, version, extEls };

  if (gsap && isFunction(gsap.to)) {
    anim.setup(els);
    const showTl = gsap.timeline();
    anim.show(showTl, els);

    setTimeout(() => {
      const hideTl = gsap.timeline({
        onComplete: () => {
          div.remove();
          if (onDone) onDone();
        },
      });
      anim.hide(hideTl, els);
    }, 2000);
  } else {
    setStyle(div, { transition: "opacity 0.3s ease", opacity: "1" });
    setTimeout(() => {
      setStyle(div, { opacity: "0" });
      setTimeout(() => {
        div.remove();
        if (onDone) onDone();
      }, 400);
    }, 1000);
  }
}
