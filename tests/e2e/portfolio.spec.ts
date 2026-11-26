import { expect, test } from "@playwright/test";

test.describe("Portfolio E2E", () => {
  test("first visit plays complete intro into welcome gate (no-preference), selects area, and persists on reload", async ({
    page
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });

    // Overlay visível e gate fechado no início
    await expect(page.locator("html")).toHaveClass(/intro-pending/);
    await expect(page.locator("#intro-overlay")).toBeVisible();
    await expect(page.locator("#intro-skip-btn")).toBeVisible();
    await expect(page.locator("#welcome-gate")).not.toHaveClass(/is-open/);
    await expect(page.locator(".intro-reel-frame")).toHaveCount(8);

    // Aguarda conclusão da animação completa -> gate abre e overlay é removido
    await expect(page.locator("#welcome-gate")).toHaveClass(/is-open/, { timeout: 6000 });
    await expect(page.locator("#intro-overlay")).toHaveCount(0);

    await page.click('[data-welcome-cat="video"]');
    await expect(page.locator("#welcome-gate")).not.toHaveClass(/is-open/, { timeout: 3000 });
    await expect(page).toHaveURL(/#video$/);
    await expect(page.locator("#switch-area-btn")).toHaveClass(/is-visible/);
    await expect(page.locator("#sub-nav .sub-btn").first()).toBeVisible();

    await page.reload();
    await expect(page.locator("#welcome-gate")).not.toHaveClass(/is-open/);
    await expect(page.locator("#switch-area-btn")).toHaveClass(/is-visible/);
    expect(errors).toEqual([]);
  });

  test("plays complete cinematic intro automatically even when reducedMotion is 'reduce'", async ({
    browser
  }) => {
    const errors: string[] = [];
    const context = await browser.newContext({
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });

    // Abertura completa executa obrigatoriamente mesmo com reducedMotion: reduce
    await expect(page.locator("html")).toHaveClass(/intro-pending/);
    await expect(page.locator("#intro-overlay")).toBeVisible();
    await expect(page.locator("#intro-skip-btn")).toBeVisible();
    await expect(page.locator("#welcome-gate")).not.toHaveClass(/is-open/);
    await expect(page.locator(".intro-reel-frame")).toHaveCount(8);

    // Conclui naturalmente para o Welcome Gate
    await expect(page.locator("#welcome-gate")).toHaveClass(/is-open/, { timeout: 6000 });
    await expect(page.locator("#intro-overlay")).toHaveCount(0);

    expect(errors).toEqual([]);
    await context.close();
  });

  test("'Pular abertura' button immediately completes intro and opens the welcome gate", async ({
    page
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#intro-skip-btn")).toBeVisible();
    await expect(page.locator("#intro-skip-btn")).toHaveText("Pular abertura");

    // Clica no botão discreto de pular
    await page.click("#intro-skip-btn");

    // Transição imediata para o Welcome Gate aberto e remoção do overlay
    await expect(page.locator("#welcome-gate")).toHaveClass(/is-open/, { timeout: 1500 });
    await expect(page.locator("#intro-overlay")).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test("direct hash navigation, subfilters, history, lightbox and quote modal work without errors", async ({
    page
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/index.html#video");
    await expect(page.locator("#welcome-gate")).not.toHaveClass(/is-open/);
    await expect(page.locator(".masonry-item").first()).toBeVisible();

    const subBtn = page.locator('#sub-nav .sub-btn[data-subfilter="saude"]');
    await subBtn.click();
    await expect(subBtn).toHaveClass(/is-active/);

    await page.click('.nav-btn[data-category="sobre"]');
    await expect(page).toHaveURL(/#sobre$/);
    await expect(page.locator("#about-section")).toHaveClass(/is-visible/);

    await page.goBack();
    await expect(page).toHaveURL(/#video$/);
    await expect(page.locator("#about-section")).not.toHaveClass(/is-visible/);

    // Lightbox open, step, close
    await page.locator(".masonry-item").first().click();
    await expect(page.locator("#lightbox")).toHaveClass(/is-open/);
    await expect(page.locator("#lightbox-content iframe")).toHaveAttribute(
      "src",
      /youtube-nocookie\.com\/embed/
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("#lightbox")).not.toHaveClass(/is-open/, { timeout: 3000 });

    // Quote modal
    await page.click("#header-whatsapp");
    await expect(page.locator("#quote-modal")).toHaveClass(/is-open/);
    await page.click('[data-quote-value="VSL"]');
    await expect(page.locator("#quote-submit-btn")).toHaveAttribute("href", /VSL/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#quote-modal")).not.toHaveClass(/is-open/);

    expect(errors).toEqual([]);
  });

  test("admin page loads projects, filters, searches and opens add modal", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/admin.html");
    await expect(page.locator(".admin-card").first()).toBeVisible();

    await page.fill("#search-input", "Aesthetic");
    await expect(page.locator(".admin-card")).toHaveCount(1);

    await page.click("#btn-add");
    await expect(page.locator("#item-modal")).toHaveClass(/is-open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#item-modal")).not.toHaveClass(/is-open/);

    expect(errors).toEqual([]);
  });

  test("responsive 2-column mobile layout displays correctly", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }
    });
    const page = await context.newPage();

    await page.goto("/index.html#video");
    await expect(page.locator(".masonry-col")).toHaveCount(2);

    await context.close();
  });

  test("second cinematic transition: selected card becomes reveal aperture with opaque backdrop", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });

    // Espera gate abrir
    await expect(page.locator("#welcome-gate")).toHaveClass(/is-open/, { timeout: 6000 });

    // Verifica que o backdrop está 100% opaco e cobrindo a galeria
    const backdropColor = await page.locator("#backdrop").evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(backdropColor).toMatch(/(rgb\(11,\s*11,\s*11\)|rgba\(11,\s*11,\s*11,\s*1\))/);

    // Clica no card "Editor de vídeo"
    const videoBtn = page.locator(".welcome-option[data-welcome-cat='video']");
    await videoBtn.click();

    // Durante a transição, a classe gate-transitioning é aplicada e o shared aperture é criado
    await expect(page.locator("html")).toHaveClass(/gate-transitioning/);
    await expect(page.locator("#shared-card-aperture")).toBeVisible();

    // Ao concluir, a galeria está pronta, URL atualizada e aperture removido
    await expect(page.locator("html")).not.toHaveClass(/gate-transitioning/, { timeout: 3000 });
    await expect(page.locator("#shared-card-aperture")).toHaveCount(0);
    await expect(page.locator("#welcome-gate")).not.toHaveClass(/is-open/);
    await expect(page).toHaveURL(/#video$/);
    await expect(page.locator(".masonry-col").first()).toBeVisible();

    expect(errors).toEqual([]);
  });
});
