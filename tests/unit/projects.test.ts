import { beforeEach, describe, expect, it } from "vitest";
import {
  filterProjects,
  getCaseStudyProjects,
  getFeaturedProjects,
  getIntroFrameUrls,
  getProjectBySlug,
  getProjectsList,
  getQualifiedSubcategories,
  isValidProjectItem,
  normalizeProjectItem
} from "../../src/services/projects";
import { STORAGE_KEYS } from "../../src/services/storage";
import { SAMPLE_PROJECTS } from "../fixtures/projects";

describe("projects service", () => {
  beforeEach(() => {
    localStorage.clear();
    window.DEFAULT_PROJECTS = SAMPLE_PROJECTS;
  });

  it("validates project items strictly", () => {
    expect(isValidProjectItem(SAMPLE_PROJECTS[0])).toBe(true);
    expect(isValidProjectItem({ type: "video", category: "video", title: "Sem ID" })).toBe(false);
    expect(isValidProjectItem({ type: "design", category: "design", title: "Sem Img" })).toBe(false);
    expect(isValidProjectItem(null)).toBe(false);
  });

  it("falls back safely to window.DEFAULT_PROJECTS when localStorage is empty or invalid", () => {
    expect(getProjectsList()).toHaveLength(SAMPLE_PROJECTS.length);

    localStorage.setItem(STORAGE_KEYS.PROJECTS, "invalid-json");
    expect(getProjectsList()).toHaveLength(SAMPLE_PROJECTS.length);
  });

  it("filters out hidden projects and applies category/subfilter", () => {
    const withHidden = [
      ...SAMPLE_PROJECTS,
      { ...SAMPLE_PROJECTS[0]!, title: "Oculto", visible: false }
    ];
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(withHidden));

    const visible = getProjectsList();
    expect(visible.some((p) => p.title === "Oculto")).toBe(false);

    expect(filterProjects(visible, "ia", "all")).toHaveLength(1);
    expect(filterProjects(visible, "video", "saude")).toHaveLength(2);
  });

  it("qualifies subcategories only when >= 2 tags have >= 2 items", () => {
    const subs = getQualifiedSubcategories("video", SAMPLE_PROJECTS);
    expect(subs.map((s) => s.id)).toEqual(["saude", "institucional"]);

    const designSubs = getQualifiedSubcategories("design", SAMPLE_PROJECTS);
    expect(designSubs).toEqual([]);
  });

  it("builds balanced intro frame URLs across categories", () => {
    const urls = getIntroFrameUrls(SAMPLE_PROJECTS, 4);
    expect(urls.length).toBe(4);
    expect(urls[0]).toContain("i.ytimg.com");
  });

  it("normalizes Portfolio 2.0 metadata, generates slugs and finds projects by slug", () => {
    const normalized = normalizeProjectItem({
      type: "video",
      category: "video",
      id: "abc12345678",
      title: "Edição Dinâmica & Ritmo"
    });
    expect(normalized.slug).toBe("edicao-dinamica-ritmo");

    const itemWithSlug = {
      ...SAMPLE_PROJECTS[0]!,
      slug: "social-media-edicao-dinamica",
      featured: true,
      caseStudy: true
    };
    window.DEFAULT_PROJECTS = [itemWithSlug, ...SAMPLE_PROJECTS.slice(1)];

    const found = getProjectBySlug("social-media-edicao-dinamica");
    expect(found).toBeDefined();
    expect(found?.title).toBe(SAMPLE_PROJECTS[0]?.title);

    expect(getFeaturedProjects().length).toBeGreaterThan(0);
    expect(getCaseStudyProjects().length).toBeGreaterThan(0);
  });
});
