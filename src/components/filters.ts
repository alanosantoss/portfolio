import { getQualifiedSubcategories } from "../services/projects";
import type { MainCategory, ProjectItem } from "../types/project";
import { escapeHtml } from "../utils/security";

export interface RenderFiltersOptions {
  category: MainCategory;
  activeSubFilter: string;
  projects: ProjectItem[];
  onSelectSubFilter: (subfilter: string) => void;
  onResetSubFilter: () => void;
}

export function renderFilters(options: RenderFiltersOptions): void {
  const subNav = document.getElementById("sub-nav");
  if (!subNav) return;

  if (options.category === "home" || options.category === "sobre") {
    subNav.classList.add("is-hidden");
    subNav.innerHTML = "";
    return;
  }

  const qualified = getQualifiedSubcategories(options.category, options.projects);
  if (qualified.length < 2) {
    options.onResetSubFilter();
    subNav.classList.add("is-hidden");
    subNav.innerHTML = "";
    return;
  }

  const currentValid = qualified.some((f) => f.id === options.activeSubFilter)
    ? options.activeSubFilter
    : "all";

  if (currentValid !== options.activeSubFilter) {
    options.onResetSubFilter();
  }

  const filters = [{ id: "all", label: "todos" }, ...qualified];
  subNav.classList.remove("is-hidden");
  subNav.innerHTML = filters
    .map(
      (f) =>
        `<button type="button" class="sub-btn ${f.id === currentValid ? "is-active" : ""}" data-subfilter="${escapeHtml(f.id)}">${escapeHtml(f.label)}</button>`
    )
    .join("");

  subNav.querySelectorAll<HTMLButtonElement>(".sub-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const subfilter = btn.dataset.subfilter;
      if (subfilter) options.onSelectSubFilter(subfilter);
    });
  });
}

export function updateActiveSubFilter(subfilter: string): void {
  document.querySelectorAll<HTMLElement>("#sub-nav .sub-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.subfilter === subfilter);
  });
}
