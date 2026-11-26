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
    visible: fields.visible !== false
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
