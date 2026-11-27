import { describe, expect, it, vi } from "vitest";
import {
  normalizeHashCategory,
  parseHashRoute,
  pushCategoryHash,
  pushProjectHash
} from "../../src/core/router";

describe("router", () => {
  it("normalizes valid and invalid hash categories", () => {
    expect(normalizeHashCategory("#video")).toBe("video");
    expect(normalizeHashCategory("#DESIGN")).toBe("design");
    expect(normalizeHashCategory("#sobre")).toBe("sobre");
    expect(normalizeHashCategory("#invalido")).toBe("home");
    expect(normalizeHashCategory("")).toBe("home");
  });

  it("parses project direct hash routes", () => {
    const route = parseHashRoute("#project/social-media-edicao-dinamica");
    expect(route.category).toBe("home");
    expect(route.projectSlug).toBe("social-media-edicao-dinamica");

    const normal = parseHashRoute("#video");
    expect(normal.category).toBe("video");
    expect(normal.projectSlug).toBeUndefined();
  });

  it("falls back to window.location.hash if history.pushState throws SecurityError", () => {
    const spy = vi.spyOn(window.history, "pushState").mockImplementation(() => {
      throw new DOMException("SecurityError", "SecurityError");
    });

    pushCategoryHash("video");
    expect(window.location.hash).toBe("#video");

    pushProjectHash("meu-projeto");
    expect(window.location.hash).toBe("#project/meu-projeto");
    spy.mockRestore();
  });
});
