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

export function slugifyTitle(title: string): string {
  return (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeProjectItem(item: ProjectItem): ProjectItem {
  const title = (item.title || "").trim();
  const slug = item.slug && typeof item.slug === "string" && item.slug.trim()
    ? item.slug.trim()
    : (title ? slugifyTitle(title) : (item.id || "project"));

  return {
    ...item,
    title,
    slug,
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
    visible: item.visible !== false,
    client: item.client ? String(item.client).trim() : undefined,
    summary: item.summary ? String(item.summary).trim() : undefined,
    description: item.description ? String(item.description).trim() : undefined,
    role: Array.isArray(item.role) ? item.role.map((r) => String(r).trim()).filter(Boolean) : undefined,
    services: Array.isArray(item.services) ? item.services.map((s) => String(s).trim()).filter(Boolean) : undefined,
    tools: Array.isArray(item.tools) ? item.tools.map((t) => String(t).trim()).filter(Boolean) : undefined,
    deliverables: Array.isArray(item.deliverables) ? item.deliverables.map((d) => String(d).trim()).filter(Boolean) : undefined,
    duration: item.duration ? String(item.duration).trim() : undefined,
    year: typeof item.year === "number" && !isNaN(item.year) ? item.year : undefined,
    featured: Boolean(item.featured),
    caseStudy: Boolean(item.caseStudy),
    previewUrl: item.previewUrl && isSafeImageUrl(item.previewUrl) ? item.previewUrl.trim() : undefined,
    posterUrl: item.posterUrl && isSafeImageUrl(item.posterUrl) ? item.posterUrl.trim() : undefined,
    beforeImage: item.beforeImage && isSafeImageUrl(item.beforeImage) ? item.beforeImage.trim() : undefined,
    afterImage: item.afterImage && isSafeImageUrl(item.afterImage) ? item.afterImage.trim() : undefined,
    demoUrl: item.demoUrl && isSafeImageUrl(item.demoUrl) ? item.demoUrl.trim() : undefined,
    outcomes: Array.isArray(item.outcomes)
      ? item.outcomes
          .filter((o) => o && typeof o.label === "string" && typeof o.value === "string")
          .map((o) => ({
            label: String(o.label).trim(),
            value: String(o.value).trim(),
            context: o.context ? String(o.context).trim() : undefined
          }))
      : undefined
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

export function getProjectBySlug(slugOrId: string): ProjectItem | undefined {
  const clean = (slugOrId || "").toLowerCase().trim();
  if (!clean) return undefined;
  const list = getAllProjects();
  return list.find(
    (item) =>
      (item.slug && item.slug.toLowerCase() === clean) ||
      (item.id && item.id.toLowerCase() === clean) ||
      slugifyTitle(item.title) === clean
  );
}

export function getFeaturedProjects(): ProjectItem[] {
  const list = getProjectsList();
  const featured = list.filter((p) => p.featured);
  return featured.length > 0 ? featured : list.slice(0, 6);
}

export function getCaseStudyProjects(): ProjectItem[] {
  return getProjectsList().filter((p) => p.caseStudy);
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
