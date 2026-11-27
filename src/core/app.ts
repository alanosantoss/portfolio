import { killCinematicIntro, runCinematicIntro } from "../animations/cinematic-intro";
import { ensureGsapPlugins } from "../animations/gsap";
import { createCaseStudyView } from "../components/case-study";
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
import { trackEvent } from "../services/analytics";
import { filterProjects, getProjectBySlug, getProjectsList } from "../services/projects";
import { STORAGE_KEYS } from "../services/storage";
import { INTRO_STATES, type IntroState } from "../types/app";
import type { MainCategory, ProjectCategory, ProjectItem } from "../types/project";
import { getRequiredElement } from "../utils/dom";
import { getColumnCount } from "../utils/media";
import { VALID_CATEGORIES } from "./config";
import { bindLocationSync, parseHashRoute, pushCategoryHash, pushProjectHash } from "./router";
import { getState, setState } from "./state";

let initialized = false;
let cleanupListeners: Array<() => void> = [];
let lastColumnCount = 4;
let activeCaseStudyEl: HTMLElement | null = null;

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

function closeActiveCaseStudy(): void {
  if (activeCaseStudyEl) {
    const cleanup = (activeCaseStudyEl as unknown as { _cleanup?: () => void })._cleanup;
    if (typeof cleanup === "function") cleanup();
    activeCaseStudyEl.remove();
    activeCaseStudyEl = null;
    document.body.style.overflow = "";
    pushCategoryHash(getState().activeCategory);
  }
}

function openProjectCaseStudy(project: ProjectItem): void {
  closeActiveCaseStudy();
  trackEvent("case_study_viewed", {
    projectSlug: project.slug,
    projectTitle: project.title,
    category: project.category
  });

  const slug = project.slug || project.id || "project";
  pushProjectHash(slug);

  activeCaseStudyEl = createCaseStudyView({
    project,
    onClose: () => {
      closeActiveCaseStudy();
    },
    onRequestQuote: (p) => {
      closeActiveCaseStudy();
      quoteModalController.open(null, {
        service: p.category,
        projectTitle: p.title,
        projectUrl: window.location.href
      });
      trackEvent("quote_modal_opened", {
        context: "case_study",
        projectTitle: p.title
      });
    },
    onShare: (p) => {
      const url = `${window.location.origin}${window.location.pathname}#project/${p.slug || p.id}`;
      navigator.clipboard?.writeText(url).then(() => {
        alert("Link direto do projeto copiado para a área de transferência!");
        trackEvent("project_link_copied", { projectSlug: p.slug, projectTitle: p.title });
      });
    }
  });

  document.body.appendChild(activeCaseStudyEl);
  document.body.style.overflow = "hidden";
}

function handleOpenProject(index: number, card: HTMLElement): void {
  const items = getState().currentItems;
  const project = items[index];
  if (!project) return;

  trackEvent("project_opened", {
    projectSlug: project.slug,
    projectTitle: project.title,
    category: project.category
  });

  // Em cards comuns da galeria, abre o Lightbox rápido e cinematográfico
  // Se estiver em rota direta de case study ou se o card tiver botão específico, abre o case study
  lightboxController.open(index, card);
}

function updateGalleryView(): void {
  const { activeCategory, activeSubFilter } = getState();
  const projects = getProjectsList();
  const filtered = filterProjects(projects, activeCategory, activeSubFilter);
  setState({ currentItems: filtered });

  lastColumnCount = renderGallery({
    category: activeCategory,
    items: filtered,
    onOpenProject: handleOpenProject,
    onPlayShowreel: () => {
      trackEvent("showreel_played");
      // Abre o primeiro vídeo da galeria ou vídeo modelo no lightbox
      const firstVideoIndex = filtered.findIndex((item) => item.type === "video");
      if (firstVideoIndex >= 0) {
        lightboxController.open(firstVideoIndex);
      }
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

function registerGlobalEvents(): void {
  const unbindLocation = bindLocationSync((route) => {
    if (route.projectSlug) {
      const proj = getProjectBySlug(route.projectSlug);
      if (proj) {
        openProjectCaseStudy(proj);
        return;
      }
    } else if (activeCaseStudyEl) {
      closeActiveCaseStudy();
    }

    if (route.category !== getState().activeCategory) {
      setCategory(route.category, false);
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
      if (activeCaseStudyEl) {
        closeActiveCaseStudy();
        return;
      }
      const skipBtn = document.getElementById("intro-skip-btn");
      if (document.documentElement.classList.contains("intro-running") && skipBtn) {
        skipBtn.click();
        return;
      }
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
    const initialRoute = parseHashRoute(window.location.hash);
    const initialCategory = initialRoute.category;

    initHeaderContacts((trigger) => quoteModalController.open(trigger));
    quoteModalController.init();
    bindHeaderNavigation(
      (cat) => setCategory(cat, true),
      () => setCategory(getState().lockedCategory || "home", true)
    );
    lightboxController.init();
    registerGlobalEvents();

    setCategory(initialCategory, false);

    // Se houver link direto para projeto (#project/slug), pula intro/gate e abre direto
    if (initialRoute.projectSlug) {
      document.documentElement.classList.remove("intro-pending");
      const proj = getProjectBySlug(initialRoute.projectSlug);
      if (proj) {
        openProjectCaseStudy(proj);
      }
      return;
    }

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
