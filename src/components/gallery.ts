import type { MainCategory, ProjectItem } from "../types/project";
import { getColumnCount, getRatioWeight } from "../utils/media";
import { createProjectCard } from "./project-card";

export interface RenderGalleryOptions {
  category: MainCategory;
  items: ProjectItem[];
  onOpenProject: (index: number, card: HTMLElement) => void;
}

export function renderGallery(options: RenderGalleryOptions): number {
  const galleryGrid = document.getElementById("gallery-grid");
  const aboutSection = document.getElementById("about-section");
  if (!galleryGrid || !aboutSection) return getColumnCount();

  if (options.category === "sobre") {
    galleryGrid.style.display = "none";
    aboutSection.classList.add("is-visible");
    return getColumnCount();
  }

  aboutSection.classList.remove("is-visible");
  galleryGrid.style.display = "";
  galleryGrid.innerHTML = "";

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
    let shortestCol = 0;
    for (let c = 1; c < colCount; c++) {
      if ((colHeights[c] ?? 0) < (colHeights[shortestCol] ?? 0)) {
        shortestCol = c;
      }
    }
    cols[shortestCol]?.appendChild(card);
    colHeights[shortestCol] = (colHeights[shortestCol] ?? 0) + getRatioWeight(item) + 0.08;
  });

  return colCount;
}
