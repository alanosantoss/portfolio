import { ensureGsapPlugins, Flip } from "../animations/gsap";
import type { MainCategory, ProjectItem } from "../types/project";
import { prefersReducedMotion } from "../utils/media";
import { getColumnCount, getRatioWeight } from "../utils/media";
import { createProjectCard } from "./project-card";

export interface RenderGalleryOptions {
  category: MainCategory;
  items: ProjectItem[];
  onOpenProject: (index: number, card: HTMLElement) => void;
  onPlayShowreel?: () => void;
}

export function renderGallery(options: RenderGalleryOptions): number {
  const galleryGrid = document.getElementById("gallery-grid");
  const aboutSection = document.getElementById("about-section");
  if (!galleryGrid || !aboutSection) return getColumnCount();

  // Remove contêiner editorial anterior se existir
  const existingHero = document.getElementById("editorial-hero-container");
  if (existingHero) {
    existingHero.remove();
  }

  // Remove contêineres legados de Home se existirem
  const legacyHome = document.getElementById("home-curated-sections");
  if (legacyHome) {
    legacyHome.remove();
  }

  const galleryHeader = document.getElementById("gallery-header");
  const galleryEyebrow = document.getElementById("gallery-eyebrow");
  const galleryHeading = document.getElementById("gallery-heading");

  if (options.category === "sobre") {
    if (galleryHeader) galleryHeader.style.display = "none";
    galleryGrid.style.display = "none";
    aboutSection.classList.add("is-visible");
    return getColumnCount();
  }

  ensureGsapPlugins();
  const existingCards = Array.from(galleryGrid.querySelectorAll<HTMLElement>(".masonry-item"));
  let flipState: Flip.FlipState | null = null;
  if (!prefersReducedMotion() && existingCards.length > 0) {
    existingCards.forEach((c) => {
      const slug = c.dataset.slug || c.dataset.index;
      if (slug) c.dataset.flipId = `card-${slug}`;
    });
    flipState = Flip.getState(existingCards, { props: "opacity" });
  }

  aboutSection.classList.remove("is-visible");
  if (galleryHeader) galleryHeader.style.display = "";
  galleryGrid.style.display = "";
  galleryGrid.innerHTML = "";

  // Atualiza títulos contextuais da galeria conforme a categoria
  if (galleryEyebrow && galleryHeading) {
    if (options.category === "design") {
      galleryEyebrow.textContent = "PORTFÓLIO CRIATIVO";
      galleryHeading.textContent = "Projetos de design";
    } else if (options.category === "ia") {
      galleryEyebrow.textContent = "TECNOLOGIA CRIATIVA";
      galleryHeading.textContent = "Projetos com IA";
    } else if (options.category === "home") {
      galleryEyebrow.textContent = "PORTFÓLIO EDITORIAL";
      galleryHeading.textContent = "Trabalhos selecionados";
    } else {
      // Padrão: Audiovisual / Video
      galleryEyebrow.textContent = "PORTFÓLIO AUDIOVISUAL";
      galleryHeading.textContent = "Trabalhos em vídeo";
    }
  }

  if (options.items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "masonry-empty";
    empty.textContent = "Nenhum projeto encontrado nesta categoria.";
    galleryGrid.appendChild(empty);
    return getColumnCount();
  }

  const colCount = getColumnCount();
  const cols: HTMLDivElement[] = [];
  const colHeights = new Array<number>(colCount).fill(0);

  for (let i = 0; i < colCount; i++) {
    const col = document.createElement("div");
    col.className = "masonry-col";
    cols.push(col);
    galleryGrid.appendChild(col);
  }

  options.items.forEach((item, index) => {
    const card = createProjectCard(item, index, options.onOpenProject);
    const slug = item.slug || item.id || String(index);
    card.dataset.flipId = `card-${slug}`;
    let shortestCol = 0;
    for (let c = 1; c < colCount; c++) {
      if ((colHeights[c] ?? 0) < (colHeights[shortestCol] ?? 0)) {
        shortestCol = c;
      }
    }
    cols[shortestCol]?.appendChild(card);
    colHeights[shortestCol] = (colHeights[shortestCol] ?? 0) + getRatioWeight(item) + 0.08;
  });

  if (flipState && !prefersReducedMotion()) {
    const newCards = galleryGrid.querySelectorAll<HTMLElement>(".masonry-item");
    Flip.from(flipState, {
      targets: newCards,
      duration: 0.35,
      ease: "power2.out",
      stagger: 0.02,
      fade: true,
      absolute: false,
      onEnter: (elements) => {
        elements.forEach((el) => {
          (el as HTMLElement).style.opacity = "0";
          (el as HTMLElement).style.transform = "translateY(12px)";
        });
      }
    });
  }

  return colCount;
}
