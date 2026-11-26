import { expect, test } from "@playwright/test";

test.describe("Portfolio E2E", () => {
  test("first visit plays intro into welcome gate, selects area, and persists on reload", async ({
    page
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/index.html");
    await expect(page.locator("#welcome-gate")).toHaveClass(/is-open/, { timeout: 6000 });

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

  test("respects prefers-reduced-motion and responsive 2-column mobile layout", async ({
    browser
  }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 375, height: 812 }
    });
    const page = await context.newPage();

    await page.goto("/index.html");
    await expect(page.locator("#welcome-gate")).toHaveClass(/is-open/, { timeout: 2000 });
    await page.click("#welcome-skip");
    await expect(page.locator(".masonry-col")).toHaveCount(2);

    await context.close();
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
});
