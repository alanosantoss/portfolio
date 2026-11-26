import { describe, expect, it } from "vitest";
import { buildProjectPayload, filterAdminProjects, moveProject } from "../../src/admin/project-manager";
import { formatProjectsFile } from "../../src/admin/storage";
import { SAMPLE_PROJECTS } from "../fixtures/projects";

describe("admin project manager", () => {
  it("preserves design type in ia category and removes stale id", () => {
    const payload = buildProjectPayload(
      {
        type: "design",
        category: "ia",
        rawSource: "https://images.unsplash.com/photo-123",
        title: "Render IA",
        aspect: "3:2",
        tags: ["ia", "renders"],
        visible: true
      },
      { type: "video", category: "video", id: "abc12345678", title: "Old" }
    );

    expect(payload.type).toBe("design");
    expect(payload.category).toBe("ia");
    expect(payload.ratio).toBe("ratio-3-2");
    expect(payload.image).toBe("https://images.unsplash.com/photo-123");
    expect(payload.id).toBeUndefined();
  });

  it("filters admin projects by category and search query", () => {
    const res = filterAdminProjects(SAMPLE_PROJECTS, "video", "aesthetic");
    expect(res).toHaveLength(1);
    expect(res[0]?.item.title).toBe("Aesthetic Gym");
  });

  it("moves projects safely within bounds", () => {
    const moved = moveProject(SAMPLE_PROJECTS, 0, 2);
    expect(moved?.[2]?.title).toBe(SAMPLE_PROJECTS[0]?.title);
    expect(moveProject(SAMPLE_PROJECTS, 0, -1)).toBeNull();
  });

  it("formats projects.js omitting visible: true", () => {
    const out = formatProjectsFile([{ ...SAMPLE_PROJECTS[0]!, visible: true }]);
    expect(out.startsWith("window.DEFAULT_PROJECTS = ")).toBe(true);
    expect(out).not.toContain('"visible": true');
  });
});
