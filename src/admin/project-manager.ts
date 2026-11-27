import type { AspectRatio, ProjectCategory, ProjectItem, ProjectType } from "../types/project";
import { ASPECT_TO_RATIO } from "../utils/media";
import { extractYouTubeId } from "../utils/security";

export interface ProjectPayloadFields {
  type: ProjectType;
  category: ProjectCategory;
  rawSource: string;
  title: string;
  aspect: string;
  tags: string[];
  visible: boolean;

  // Extended fields
  slug?: string;
  client?: string;
  summary?: string;
  description?: string;
  role?: string[];
  services?: string[];
  tools?: string[];
  deliverables?: string[];
  duration?: string;
  year?: number;
  featured?: boolean;
  caseStudy?: boolean;
  previewUrl?: string;
  beforeImage?: string;
  afterImage?: string;
  demoUrl?: string;
}

export function buildProjectPayload(
  fields: ProjectPayloadFields,
  previousItem: ProjectItem | null = null
): ProjectItem {
  const type: ProjectType = fields.type === "design" ? "design" : "video";
  const aspect: AspectRatio =
    fields.aspect in ASPECT_TO_RATIO ? (fields.aspect as AspectRatio) : "16:9";
  const ratio = ASPECT_TO_RATIO[aspect];
  const base: Partial<ProjectItem> = previousItem ? { ...previousItem } : {};
  delete base.id;
  delete base.image;

  const payload: ProjectItem = {
    ...base,
    type,
    category: fields.category || "video",
    title: String(fields.title || "").trim(),
    aspect,
    ratio,
    tags: Array.isArray(fields.tags) ? fields.tags : [],
    visible: fields.visible !== false,
    slug: fields.slug ? String(fields.slug).trim() : undefined,
    client: fields.client ? String(fields.client).trim() : undefined,
    summary: fields.summary ? String(fields.summary).trim() : undefined,
    description: fields.description ? String(fields.description).trim() : undefined,
    role: fields.role,
    services: fields.services,
    tools: fields.tools,
    deliverables: fields.deliverables,
    duration: fields.duration ? String(fields.duration).trim() : undefined,
    year: fields.year,
    featured: Boolean(fields.featured),
    caseStudy: Boolean(fields.caseStudy),
    previewUrl: fields.previewUrl ? String(fields.previewUrl).trim() : undefined,
    beforeImage: fields.beforeImage ? String(fields.beforeImage).trim() : undefined,
    afterImage: fields.afterImage ? String(fields.afterImage).trim() : undefined,
    demoUrl: fields.demoUrl ? String(fields.demoUrl).trim() : undefined
  };

  if (type === "video") {
    payload.id = extractYouTubeId(fields.rawSource);
  } else {
    payload.image = String(fields.rawSource || "").trim();
  }

  return payload;
}

export interface IndexedProject {
  item: ProjectItem;
  originalIndex: number;
}

export function filterAdminProjects(
  projects: ProjectItem[],
  activeFilter: string,
  searchQuery: string
): IndexedProject[] {
  let filtered = projects.map((item, originalIndex) => ({ item, originalIndex }));

  if (activeFilter !== "all") {
    filtered = filtered.filter(({ item }) => item.category === activeFilter);
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  if (trimmedQuery) {
    filtered = filtered.filter(
      ({ item }) =>
        (item.title || "").toLowerCase().includes(trimmedQuery) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(trimmedQuery))
    );
  }

  return filtered;
}

export function moveProject(
  projects: ProjectItem[],
  fromIndex: number,
  toIndex: number
): ProjectItem[] | null {
  if (
    fromIndex < 0 ||
    fromIndex >= projects.length ||
    toIndex < 0 ||
    toIndex >= projects.length ||
    fromIndex === toIndex
  ) {
    return null;
  }

  const copy = [...projects];
  const [moved] = copy.splice(fromIndex, 1);
  if (!moved) return null;
  copy.splice(toIndex, 0, moved);
  return copy;
}
