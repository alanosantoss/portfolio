import type { MainCategory } from "../types/project";
import { VALID_CATEGORIES } from "./config";

export function normalizeHashCategory(rawHash: string): MainCategory {
  const cleaned = (rawHash || "").replace(/^#/, "").toLowerCase();
  return (VALID_CATEGORIES as readonly string[]).includes(cleaned)
    ? (cleaned as MainCategory)
    : "home";
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

export function bindLocationSync(onRouteChange: (category: MainCategory) => void): () => void {
  const handleLocationChange = () => {
    onRouteChange(normalizeHashCategory(window.location.hash));
  };
  window.addEventListener("hashchange", handleLocationChange);
  window.addEventListener("popstate", handleLocationChange);

  return () => {
    window.removeEventListener("hashchange", handleLocationChange);
    window.removeEventListener("popstate", handleLocationChange);
  };
}
