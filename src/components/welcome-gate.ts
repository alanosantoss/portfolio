import { runGalleryReveal } from "../animations/gallery-reveal";
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
  close: (
    category?: ProjectCategory | null,
    unlockAll?: boolean,
    triggerElement?: HTMLElement | null,
    clickCoords?: { x: number; y: number } | null
  ) => void;
  isOpen: () => boolean;
}

export function createWelcomeGateController(callbacks: WelcomeGateCallbacks): WelcomeGateController {
  let exitRaf = 0;

  const getElements = () => {
    const gate = document.getElementById("welcome-gate");
    if (!gate) return null;
    const card = gate.querySelector<HTMLElement>(".welcome-card");
    const backdrop = document.getElementById("backdrop") || document.querySelector<HTMLElement>(".site-backdrop");
    return { gate, card, backdrop };
  };

  const open = () => {
    const els = getElements();
    if (!els || !els.card) return;
    const { gate, card, backdrop } = els;

    if (exitRaf) {
      cancelAnimationFrame(exitRaf);
      exitRaf = 0;
    }

    gate.style.visibility = "visible";
    gate.classList.add("is-open", "ready");
    gate.removeAttribute("inert");
    gate.setAttribute("aria-hidden", "false");
    card.style.opacity = "1";
    card.style.transform = "none";

    if (backdrop) {
      backdrop.style.backgroundColor = "#0B0B0B";
      backdrop.style.backdropFilter = "none";
      (backdrop.style as HTMLElement["style"] & { webkitBackdropFilter?: string }).webkitBackdropFilter = "none";
      backdrop.style.pointerEvents = "auto";
    }

    document.body.style.overflow = "hidden";
    callbacks.onStateChange(INTRO_STATES.GATE_READY);

    const firstOption = gate.querySelector<HTMLElement>(".welcome-option");
    if (firstOption && typeof firstOption.focus === "function") {
      setTimeout(() => firstOption.focus({ preventScroll: true }), 40);
    }
  };

  const close = (
    category?: ProjectCategory | null,
    unlockAll = false,
    triggerElement?: HTMLElement | null,
    clickCoords?: { x: number; y: number } | null
  ) => {
    const els = getElements();
    if (!els || !els.card) return;

    if (callbacks.getIntroState() === INTRO_STATES.AREA_TRANSITION) return;
    setSessionStorageItem(STORAGE_KEYS.WELCOME_SEEN, "1");

    const prepareDestination = () => {
      if (category) {
        setSessionStorageItem(STORAGE_KEYS.WELCOME_CAT, category);
        callbacks.onCategoryLock(category);
        callbacks.onSelectCategory(category, true);
      } else if (unlockAll) {
        removeSessionStorageItem(STORAGE_KEYS.WELCOME_CAT);
        callbacks.onCategoryLock(null);
        callbacks.onSelectCategory("home", true);
      }
    };

    // A transicao cinematica executa consistentemente sem bypass por prefers-reduced-motion (politica aprovada da abertura)
    runGalleryReveal({
      triggerElement: triggerElement || null,
      clickCoords: clickCoords || null,
      onStateChange: callbacks.onStateChange,
      onPrepareDestination: prepareDestination,
      onComplete: () => {
        // Callback concluído
      }
    });
  };

  const isOpen = (): boolean => {
    return Boolean(document.getElementById("welcome-gate")?.classList.contains("is-open"));
  };

  const init = (initialCategory: MainCategory, _options: { forceOpen?: boolean } = {}) => {
    const els = getElements();
    if (!els) return;
    const { gate, backdrop } = els;

    if (!gate.dataset.gateBound) {
      gate.dataset.gateBound = "1";
      gate.querySelectorAll<HTMLElement>("[data-welcome-cat]").forEach((btn) => {
        btn.addEventListener("click", (e: MouseEvent) => {
          const cat = btn.dataset.welcomeCat as ProjectCategory | undefined;
          const coords =
            e.clientX || e.clientY
              ? { x: e.clientX, y: e.clientY }
              : null; // Se 0,0 (teclado), passa null para o centro do card ser usado
          if (cat) close(cat, false, btn, coords);
        });
      });

      document.getElementById("welcome-skip")?.addEventListener("click", () => close(null, true, null, null));
      document.getElementById("welcome-close")?.addEventListener("click", () => close(null, false, null, null));
      document.getElementById("switch-area-btn")?.addEventListener("click", open);
      gate.addEventListener("click", (e: MouseEvent) => {
        if (e.target === gate) close(null, false, null, null);
      });
    }

    const seen = getSessionStorageItem(STORAGE_KEYS.WELCOME_SEEN) === "1";
    const savedCat = getSessionStorageItem(STORAGE_KEYS.WELCOME_CAT) || "";
    const hasSavedCat = savedCat === "video" || savedCat === "design" || savedCat === "ia";

    if (seen || ["video", "design", "ia", "sobre"].includes(initialCategory)) {
      if (hasSavedCat) {
        callbacks.onCategoryLock(savedCat as ProjectCategory);
      }
      gate.style.visibility = "hidden";
      gate.classList.remove("is-open", "ready");
      gate.setAttribute("aria-hidden", "true");
      gate.setAttribute("inert", "");
      if (backdrop) {
        backdrop.style.pointerEvents = "none";
        backdrop.style.backdropFilter = "none";
        (backdrop.style as HTMLElement["style"] & { webkitBackdropFilter?: string }).webkitBackdropFilter = "none";
        backdrop.style.backgroundColor = "transparent";
      }
      callbacks.onStateChange(INTRO_STATES.PORTFOLIO_READY);
      return;
    }

    // Se a intro já abriu o gate (está pronto e visível), não precisa reanimar, apenas foca
    if (gate.classList.contains("ready") || gate.classList.contains("is-open")) {
      const firstOpt = gate.querySelector<HTMLElement>(".welcome-option");
      if (firstOpt && typeof firstOpt.focus === "function") {
        firstOpt.focus({ preventScroll: true });
      }
      return;
    }

    open();
  };

  return { init, open, close, isOpen };
}
