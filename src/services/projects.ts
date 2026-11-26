import { INTRO_CONFIG, SUBCATEGORIES } from "../core/config";
import type {
  MainCategory,
  ProjectCategory,
  ProjectItem,
  SubcategoryOption
} from "../types/project";
import { isSafeImageUrl } from "../utils/security";
import { getLocalStorageItem, STORAGE_KEYS } from "./storage";

const VALID_TYPES = new Set(["video", "design"]);
const VALID_PROJECT_CATEGORIES = new Set(["video", "design", "ia"]);

export function isValidProjectItem(item: unknown): item is ProjectItem {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const candidate = item as Partial<ProjectItem>;
  if (!candidate.type || !VALID_TYPES.has(candidate.type)) return false;
  if (!candidate.category || !VALID_PROJECT_CATEGORIES.has(candidate.category)) return false;
  if (typeof candidate.title !== "string" || !candidate.title.trim()) return false;
  if (candidate.type === "video" && (typeof candidate.id !== "string" || !candidate.id.trim())) {
    return false;
  }
  if (
    candidate.type === "design" &&
    (typeof candidate.image !== "string" || !candidate.image.trim())
  ) {
    return false;
  }
  return true;
}

export function normalizeProjectItem(item: ProjectItem): ProjectItem {
  return {
    ...item,
    title: item.title.trim(),
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
    visible: item.visible !== false
  };
}

export function getDefaultProjects(): ProjectItem[] {
  const defaults = Array.isArray(window.DEFAULT_PROJECTS) ? window.DEFAULT_PROJECTS : [];
  return defaults.filter(isValidProjectItem).map(normalizeProjectItem);
}

export function getAllProjects(): ProjectItem[] {
  const stored = getLocalStorageItem(STORAGE_KEYS.PROJECTS);
  if (stored) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(isValidProjectItem).map(normalizeProjectItem);
        if (valid.length > 0) return valid;
      }
    } catch (err) {
      console.warn("Erro ao ler projetos do localStorage:", err);
    }
  }
  return getDefaultProjects();
}

export function getProjectsList(): ProjectItem[] {
  return getAllProjects().filter((item) => item.visible !== false);
}

export function filterProjects(
  projects: ProjectItem[],
  category: MainCategory,
  subFilter: string
): ProjectItem[] {
  let list = projects;

  if (category !== "home" && category !== "sobre") {
    list = list.filter((item) => item.category === category);
  }

  if (subFilter !== "all") {
    list = list.filter((item) => Array.isArray(item.tags) && item.tags.includes(subFilter));
  }

  return list;
}

export function getQualifiedSubcategories(
  category: MainCategory,
  projects: ProjectItem[]
): SubcategoryOption[] {
  if (category === "home" || category === "sobre") return [];

  const candidates = SUBCATEGORIES[category as ProjectCategory] || [];
  const categoryItems = projects.filter((item) => item.category === category);

  const qualified = candidates.filter((sub) => {
    const count = categoryItems.filter(
      (item) => Array.isArray(item.tags) && item.tags.includes(sub.id)
    ).length;
    return count >= 2;
  });

  return qualified.length >= 2 ? [...qualified] : [];
}

export function getIntroFrameUrls(
  projects: ProjectItem[],
  frameCount: number = INTRO_CONFIG.frameCount
): string[] {
  const buckets: Record<ProjectCategory, string[]> = { video: [], design: [], ia: [] };

  for (const item of projects) {
    let url = "";
    if (item.type === "video" && item.id) {
      url = `https://i.ytimg.com/vi/${encodeURIComponent(item.id)}/hqdefault.jpg`;
    } else if (isSafeImageUrl(item.image)) {
      url = item.image;
    }
    if (!url) continue;
    const cat: ProjectCategory = item.category in buckets ? item.category : "design";
    buckets[cat].push(url);
  }

  const urls: string[] = [];
  const order: ProjectCategory[] = ["video", "design", "ia"];
  let idx = 0;

  while (urls.length < frameCount) {
    let added = false;
    for (const cat of order) {
      const candidate = buckets[cat][idx];
      if (candidate) {
        urls.push(candidate);
        added = true;
        if (urls.length >= frameCount) break;
      }
    }
    if (!added) break;
    idx++;
  }

  return urls;
}
