import {
  animateGateExit,
  clearGateMotionProps,
  type GateTransitionElements
} from "../animations/gate-transition";
import {
  getSessionStorageItem,
  removeSessionStorageItem,
  setSessionStorageItem,
  STORAGE_KEYS
} from "../services/storage";
import { INTRO_STATES, type IntroState } from "../types/app";
import type { MainCategory, ProjectCategory } from "../types/project";

export interface WelcomeGateCallbacks {
  onCategoryLock: (category: ProjectCategory | null) => void;
  onSelectCategory: (category: MainCategory, updateHash?: boolean) => void;
  onStateChange: (state: IntroState) => void;
  getIntroState: () => IntroState;
}

export interface WelcomeGateController {
  init: (initialCategory: MainCategory, options?: { forceOpen?: boolean }) => void;
  open: () => void;
  close: (category?: ProjectCategory | null, unlockAll?: boolean) => void;
  isOpen: () => boolean;
}

export function createWelcomeGateController(callbacks: WelcomeGateCallbacks): WelcomeGateController {
  let activeExitTimeline: ReturnType<typeof animateGateExit> = null;

  const getElements = (): GateTransitionElements | null => {
    const gate = document.getElementById("welcome-gate");
    if (!gate) return null;
    const card = gate.querySelector<HTMLElement>(".welcome-card");
    const contentItems = card
      ? [
          card.querySelector(".welcome-eyebrow"),
          card.querySelector("#welcome-title"),
          card.querySelector(".welcome-subtitle"),
          ...card.querySelectorAll(".welcome-option"),
          card.querySelector("#welcome-skip"),
          card.querySelector("#welcome-close")
        ].filter((el): el is HTMLElement => Boolean(el))
      : [];
    return { gate, card, contentItems };
  };

  const open = () => {
    const elements = getElements();
    if (!elements) return;

    if (activeExitTimeline) {
      activeExitTimeline.kill();
      activeExitTimeline = null;
    }

    clearGateMotionProps(elements);
    elements.gate.classList.add("is-open");
    document.body.style.overflow = "hidden";
    callbacks.onStateChange(INTRO_STATES.GATE_READY);

    const firstOption = elements.gate.querySelector<HTMLElement>(".welcome-option");
    if (firstOption && typeof firstOption.focus === "function") {
      setTimeout(() => firstOption.focus({ preventScroll: true }), 40);
    }
  };

  const close = (category?: ProjectCategory | null, unlockAll = false) => {
    const elements = getElements();
    if (!elements) return;
    if (callbacks.getIntroState() === INTRO_STATES.AREA_TRANSITION) return;

    callbacks.onStateChange(INTRO_STATES.AREA_TRANSITION);
    setSessionStorageItem(STORAGE_KEYS.WELCOME_SEEN, "1");

    if (category) {
      setSessionStorageItem(STORAGE_KEYS.WELCOME_CAT, category);
      callbacks.onCategoryLock(category);
      callbacks.onSelectCategory(category, true);
    } else if (unlockAll) {
      removeSessionStorageItem(STORAGE_KEYS.WELCOME_CAT);
      callbacks.onCategoryLock(null);
      callbacks.onSelectCategory("home", true);
    }

    const finishClose = () => {
      elements.gate.classList.remove("is-open");
      document.body.style.overflow = "";
      clearGateMotionProps(elements);
      callbacks.onStateChange(INTRO_STATES.PORTFOLIO_READY);
      activeExitTimeline = null;
    };

    activeExitTimeline = animateGateExit(elements, finishClose);
  };

  const isOpen = (): boolean => {
    return Boolean(document.getElementById("welcome-gate")?.classList.contains("is-open"));
  };

  const init = (initialCategory: MainCategory, _options: { forceOpen?: boolean } = {}) => {
    const elements = getElements();
    if (!elements) return;
    const { gate } = elements;

    if (!gate.dataset.gateBound) {
      gate.dataset.gateBound = "1";
      gate.querySelectorAll<HTMLElement>("[data-welcome-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cat = btn.dataset.welcomeCat as ProjectCategory | undefined;
          if (cat) close(cat);
        });
      });

      document.getElementById("welcome-skip")?.addEventListener("click", () => close(null, true));
      document.getElementById("welcome-close")?.addEventListener("click", () => close());
      document.getElementById("switch-area-btn")?.addEventListener("click", open);
      gate.addEventListener("click", (e: MouseEvent) => {
        if (e.target === gate) close();
      });
    }

    const savedCat = getSessionStorageItem(STORAGE_KEYS.WELCOME_CAT) || "";
    const hasSavedCat = savedCat === "video" || savedCat === "design" || savedCat === "ia";

    if (["video", "design", "ia", "sobre"].includes(initialCategory)) {
      if (hasSavedCat) {
        callbacks.onCategoryLock(savedCat);
      }
      callbacks.onStateChange(INTRO_STATES.PORTFOLIO_READY);
      return;
    }

    open();
  };

  return { init, open, close, isOpen };
}
