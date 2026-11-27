import type { MainCategory } from "../types/project";
import { VALID_CATEGORIES } from "./config";

export interface ParsedRoute {
  category: MainCategory;
  projectSlug?: string;
}

export function parseHashRoute(rawHash: string): ParsedRoute {
  const cleaned = (rawHash || "").replace(/^#/, "").trim();
  if (!cleaned) return { category: "home" };

  if (cleaned.startsWith("project/")) {
    const slug = cleaned.replace(/^project\//, "").trim();
    return { category: "home", projectSlug: slug };
  }

  if ((VALID_CATEGORIES as readonly string[]).includes(cleaned.toLowerCase())) {
    return { category: cleaned.toLowerCase() as MainCategory };
  }

  return { category: "home" };
}

export function normalizeHashCategory(rawHash: string): MainCategory {
  return parseHashRoute(rawHash).category;
}

export function pushCategoryHash(category: MainCategory): void {
  const targetHash = `#${category}`;
  if (window.location.hash !== targetHash) {
    try {
      history.pushState(null, "", targetHash);
    } catch {
      window.location.hash = targetHash;
    }
  }
}

export function pushProjectHash(slug: string): void {
  const targetHash = `#project/${slug}`;
  if (window.location.hash !== targetHash) {
    try {
      history.pushState(null, "", targetHash);
    } catch {
      window.location.hash = targetHash;
    }
  }
}

export function bindLocationSync(
  onRouteChange: (route: ParsedRoute) => void
): () => void {
  const handleLocationChange = () => {
    onRouteChange(parseHashRoute(window.location.hash));
  };
  window.addEventListener("hashchange", handleLocationChange);
  window.addEventListener("popstate", handleLocationChange);

  return () => {
    window.removeEventListener("hashchange", handleLocationChange);
    window.removeEventListener("popstate", handleLocationChange);
  };
}
