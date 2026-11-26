import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const serverModule = require(resolve(process.cwd(), "scripts/server.js")) as {
  isAllowedOrigin: (origin?: string) => boolean;
  validateProjectsPayload: (projects: unknown) => boolean;
  formatProjectsFile: (projects: Array<Record<string, unknown>>) => string;
  resolveSafeStaticPath: (reqPath: string) => string | null;
};

describe("local server.js helpers", () => {
  it("allows only localhost:8089 and 127.0.0.1:8089 origins", () => {
    expect(serverModule.isAllowedOrigin("http://localhost:8089")).toBe(true);
    expect(serverModule.isAllowedOrigin("http://127.0.0.1:8089")).toBe(true);
    expect(serverModule.isAllowedOrigin(undefined)).toBe(true);
    expect(serverModule.isAllowedOrigin("https://evil.com")).toBe(false);
  });

  it("validates projects payload strictly", () => {
    expect(
      serverModule.validateProjectsPayload([
        { type: "video", category: "video", id: "aNsA0iwBbqc", title: "Teste" }
      ])
    ).toBe(true);
    expect(serverModule.validateProjectsPayload([])).toBe(false);
    expect(
      serverModule.validateProjectsPayload([
        { type: "design", category: "design", title: "Sem Imagem" }
      ])
    ).toBe(false);
  });

  it("blocks path traversal and hidden dotfiles in resolveSafeStaticPath", () => {
    expect(serverModule.resolveSafeStaticPath("/index.html")).toContain("index.html");
    expect(serverModule.resolveSafeStaticPath("/../package.json")).toBeNull();
    expect(serverModule.resolveSafeStaticPath("/.git/config")).toBeNull();
    expect(serverModule.resolveSafeStaticPath("/%2e%2e/secret")).toBeNull();
  });

  it("formats projects.js cleanly", () => {
    const content = serverModule.formatProjectsFile([
      { type: "video", category: "video", id: "abc", title: "T", visible: true }
    ]);
    expect(content).toContain("window.DEFAULT_PROJECTS = ");
    expect(content).not.toContain('"visible": true');
  });
});
