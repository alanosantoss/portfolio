import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderGallery } from "../../src/components/gallery";
import { createLightboxController } from "../../src/components/lightbox";
import { createQuoteModalController } from "../../src/components/quote-modal";
import { attachThumbFallback } from "../../src/services/thumbnails";
import { SAMPLE_PROJECTS } from "../fixtures/projects";

function mountIndexHtml(): void {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  document.documentElement.innerHTML = html;
}

describe("DOM integration: gallery, thumbnails, lightbox, quote modal", () => {
  beforeEach(() => {
    mountIndexHtml();
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1200 });
  });

  it("renders masonry columns balanced by height and handles empty state", () => {
    const colCount = renderGallery({
      category: "home",
      items: SAMPLE_PROJECTS,
      onOpenProject: vi.fn()
    });
    expect(colCount).toBe(4);
    expect(document.querySelectorAll(".masonry-col")).toHaveLength(4);
    expect(document.querySelectorAll(".masonry-item")).toHaveLength(SAMPLE_PROJECTS.length);

    renderGallery({
      category: "home",
      items: [],
      onOpenProject: vi.fn()
    });
    expect(document.querySelector(".masonry-empty")?.textContent).toContain(
      "Nenhum projeto encontrado"
    );
  });

  it("falls back through maxresdefault -> sddefault -> hqdefault and marks error on design", () => {
    const card = document.createElement("div");
    const img = document.createElement("img");
    attachThumbFallback(img, card, SAMPLE_PROJECTS[0]!);

    img.src = "https://i.ytimg.com/vi/aNsA0iwBbqc/maxresdefault.jpg";
    img.dispatchEvent(new Event("error"));
    expect(img.src).toContain("sddefault.jpg");

    img.dispatchEvent(new Event("error"));
    expect(img.src).toContain("hqdefault.jpg");

    img.dispatchEvent(new Event("error"));
    expect(card.classList.contains("has-media-error")).toBe(true);

    const designCard = document.createElement("div");
    const designImg = document.createElement("img");
    attachThumbFallback(designImg, designCard, SAMPLE_PROJECTS[3]!);
    designImg.dispatchEvent(new Event("error"));
    expect(designCard.classList.contains("has-media-error")).toBe(true);
  });

  it("opens lightbox with escaped caption and youtube-nocookie iframe, and closes cleanly", () => {
    const onIndexChange = vi.fn();
    const lightbox = createLightboxController(() => SAMPLE_PROJECTS, onIndexChange);
    lightbox.init();

    lightbox.open(0, null);
    expect(lightbox.isOpen()).toBe(true);
    expect(onIndexChange).toHaveBeenCalledWith(0);

    const iframe = document.querySelector<HTMLIFrameElement>("#lightbox-content iframe");
    expect(iframe?.src).toContain("https://www.youtube-nocookie.com/embed/aNsA0iwBbqc");
    expect(iframe?.src).toContain("controls=0");
    expect(document.getElementById("lightbox-caption")?.textContent).toContain(
      "Social Media — Edição Dinâmica"
    );

    lightbox.step(1);
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("updates quote modal WhatsApp href when pills are toggled", () => {
    const quote = createQuoteModalController(() => "video");
    quote.init();
    quote.open(null);

    expect(quote.isOpen()).toBe(true);
    const vslBtn = Array.from(document.querySelectorAll<HTMLButtonElement>(".quote-pill")).find(
      (b) => b.dataset.quoteValue === "VSL"
    );
    vslBtn?.click();

    const submitHref =
      document.getElementById("quote-submit-btn")?.getAttribute("href") || "";
    expect(decodeURIComponent(submitHref)).toContain("Edição de vídeo");
    expect(decodeURIComponent(submitHref)).toContain("VSL");

    quote.close();
    expect(quote.isOpen()).toBe(false);
  });
});
