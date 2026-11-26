import { killCinematicIntro, runCinematicIntro } from "../animations/cinematic-intro";
import { ensureGsapPlugins } from "../animations/gsap";
import { renderFilters, updateActiveSubFilter } from "../components/filters";
import { renderGallery } from "../components/gallery";
import {
  applyHeaderCategoryLock,
  bindHeaderNavigation,
  initHeaderContacts,
  updateHeaderActiveCategory
} from "../components/header";
import { createLightboxController } from "../components/lightbox";
import { createQuoteModalController } from "../components/quote-modal";
import { createWelcomeGateController } from "../components/welcome-gate";
import { filterProjects, getProjectsList } from "../services/projects";
import { STORAGE_KEYS } from "../services/storage";
import { INTRO_STATES, type IntroState } from "../types/app";
import type { MainCategory, ProjectCategory } from "../types/project";
import { getRequiredElement } from "../utils/dom";
import { getColumnCount } from "../utils/media";
import { VALID_CATEGORIES } from "./config";
import { bindLocationSync, normalizeHashCategory, pushCategoryHash } from "./router";
import { getState, setState } from "./state";

let initialized = false;
let cleanupListeners: Array<() => void> = [];
let lastColumnCount = 4;

function updateGalleryView(): void {
  const { activeCategory, activeSubFilter } = getState();
  const projects = getProjectsList();
  const filtered = filterProjects(projects, activeCategory, activeSubFilter);
  setState({ currentItems: filtered });

  lastColumnCount = renderGallery({
    category: activeCategory,
    items: filtered,
    onOpenProject: (index, card) => {
      lightboxController?.open(index, card);
    }
  });
}

function updateFiltersView(): void {
  const { activeCategory, activeSubFilter } = getState();
  const projects = getProjectsList();

  renderFilters({
    category: activeCategory,
    activeSubFilter,
    projects,
    onSelectSubFilter: (subfilter) => setSubFilter(subfilter),
    onResetSubFilter: () => setState({ activeSubFilter: "all" })
  });
}

export function setCategory(category: MainCategory, updateHash = true): void {
  const targetCategory: MainCategory = VALID_CATEGORIES.includes(category) ? category : "home";
  setState({
    activeCategory: targetCategory,
    activeSubFilter: "all"
  });

  if (updateHash) {
    pushCategoryHash(targetCategory);
  }

  updateHeaderActiveCategory(targetCategory);
  updateFiltersView();
  updateGalleryView();
}

export function setSubFilter(subfilter: string): void {
  setState({ activeSubFilter: subfilter });
  updateActiveSubFilter(subfilter);
  updateGalleryView();
}

export function applyCategoryLock(category: ProjectCategory | null): void {
  setState({ lockedCategory: category });
  applyHeaderCategoryLock(category);
}

const lightboxController = createLightboxController(
  () => getState().currentItems,
  (index) => setState({ lightboxIndex: index })
);

const quoteModalController = createQuoteModalController(() => getState().activeCategory);

const welcomeGateController = createWelcomeGateController({
  onCategoryLock: applyCategoryLock,
  onSelectCategory: (cat, updateHash = true) => setCategory(cat, updateHash),
  onStateChange: (introState: IntroState) => setState({ introState }),
  getIntroState: () => getState().introState
});

function registerGlobalEvents(): void {
  const unbindLocation = bindLocationSync((nextCategory) => {
    if (nextCategory !== getState().activeCategory) {
      setCategory(nextCategory, false);
    }
  });

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.PROJECTS) {
      updateFiltersView();
      updateGalleryView();
    }
  };
  window.addEventListener("storage", handleStorage);

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const handleResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (getState().activeCategory !== "sobre" && getColumnCount() !== lastColumnCount) {
        updateGalleryView();
      }
    }, 120);
  };
  window.addEventListener("resize", handleResize);

  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
      e.preventDefault();
      window.location.href = "admin.html";
      return;
    }

    if (e.key === "Escape") {
      if (quoteModalController.isOpen()) {
        quoteModalController.close();
        return;
      }
      if (welcomeGateController.isOpen()) {
        welcomeGateController.close();
        return;
      }
      if (lightboxController.isOpen()) {
        lightboxController.close();
      }
      return;
    }

    if (!lightboxController.isOpen()) return;
    if (e.key === "ArrowLeft") lightboxController.step(-1);
    if (e.key === "ArrowRight") lightboxController.step(1);
    if (e.key === "Tab") {
      const focusables = [
        document.getElementById("lightbox-close"),
        document.getElementById("lightbox-prev"),
        document.getElementById("lightbox-next")
      ].filter((el): el is HTMLElement => Boolean(el));

      if (focusables.length > 0) {
        const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
        const nextIndex = e.shiftKey
          ? currentIndex <= 0
            ? focusables.length - 1
            : currentIndex - 1
          : currentIndex === -1 || currentIndex >= focusables.length - 1
            ? 0
            : currentIndex + 1;
        e.preventDefault();
        focusables[nextIndex]?.focus();
      }
    }
  };
  document.addEventListener("keydown", handleKeydown);

  cleanupListeners = [
    unbindLocation,
    () => window.removeEventListener("storage", handleStorage),
    () => window.removeEventListener("resize", handleResize),
    () => document.removeEventListener("keydown", handleKeydown)
  ];
}

export function initApp(): void {
  if (initialized) return;
  initialized = true;

  try {
    ensureGsapPlugins();
    getRequiredElement("gallery-grid");
    getRequiredElement("about-section");
    getRequiredElement("lightbox");
    getRequiredElement("lightbox-content");

    lastColumnCount = getColumnCount();
    const projects = getProjectsList();
    const initialCategory = normalizeHashCategory(window.location.hash);

    initHeaderContacts((trigger) => quoteModalController.open(trigger));
    quoteModalController.init();
    bindHeaderNavigation(
      (cat) => setCategory(cat, true),
      () => setCategory(getState().lockedCategory || "home", true)
    );
    lightboxController.init();
    registerGlobalEvents();

    setCategory(initialCategory, false);

    runCinematicIntro({
      projects,
      onStateChange: (introState) => setState({ introState }),
      onComplete: () => {
        welcomeGateController.init(initialCategory);
      }
    });
  } catch (err) {
    console.error("Erro na inicialização do portfólio:", err);
    document.documentElement.classList.remove("intro-pending");
    document.body.style.overflow = "";
    setState({ introState: INTRO_STATES.FALLBACK, isInteractionsLocked: false });
  }
}

export function destroyApp(): void {
  killCinematicIntro();
  cleanupListeners.forEach((fn) => fn());
  cleanupListeners = [];
  initialized = false;
}
