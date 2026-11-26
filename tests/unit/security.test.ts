import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  extractYouTubeId,
  isSafeImageUrl,
  isValidYouTubeId
} from "../../src/utils/security";

describe("security utils", () => {
  it("escapes HTML special characters against XSS", () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'> &`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt; &amp;"
    );
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("validates safe image URLs and blocks dangerous protocols/control chars", () => {
    expect(isSafeImageUrl("https://images.unsplash.com/photo-123")).toBe(true);
    expect(isSafeImageUrl("http://localhost:8089/assets/foto.jpg")).toBe(true);
    expect(isSafeImageUrl("assets/alan-oliveira.jpg")).toBe(true);

    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeImageUrl("//evil.com/img.png")).toBe(false);
    expect(isSafeImageUrl("../secret/file.png")).toBe(false);
    expect(isSafeImageUrl("https://example.com/\tfoo")).toBe(false);
    expect(isSafeImageUrl("https://example.com/\nfoo")).toBe(false);
    expect(isSafeImageUrl("")).toBe(false);
  });

  it("extracts and validates YouTube IDs", () => {
    expect(extractYouTubeId("aNsA0iwBbqc")).toBe("aNsA0iwBbqc");
    expect(extractYouTubeId("https://youtube.com/shorts/aNsA0iwBbqc")).toBe("aNsA0iwBbqc");
    expect(extractYouTubeId("https://www.youtube.com/watch?v=cC3g1TvjrX0&t=10s")).toBe(
      "cC3g1TvjrX0"
    );
    expect(extractYouTubeId("https://youtu.be/8lmrTdA1EsU")).toBe("8lmrTdA1EsU");

    expect(isValidYouTubeId("aNsA0iwBbqc")).toBe(true);
    expect(isValidYouTubeId("invalid")).toBe(false);
  });
});
