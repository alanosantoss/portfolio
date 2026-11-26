import { describe, expect, it, vi } from "vitest";
import { normalizeHashCategory, pushCategoryHash } from "../../src/core/router";

describe("router", () => {
  it("normalizes valid and invalid hash categories", () => {
    expect(normalizeHashCategory("#video")).toBe("video");
    expect(normalizeHashCategory("#DESIGN")).toBe("design");
    expect(normalizeHashCategory("#sobre")).toBe("sobre");
    expect(normalizeHashCategory("#invalido")).toBe("home");
    expect(normalizeHashCategory("")).toBe("home");
  });

  it("falls back to window.location.hash if history.pushState throws SecurityError", () => {
    const spy = vi.spyOn(window.history, "pushState").mockImplementation(() => {
      throw new DOMException("SecurityError", "SecurityError");
    });

    pushCategoryHash("video");
    expect(window.location.hash).toBe("#video");
    spy.mockRestore();
  });
});
