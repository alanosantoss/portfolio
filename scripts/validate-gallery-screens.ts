import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const outDir = path.resolve("artifacts/gallery-redesign-validation");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "1920x1080", width: 1920, height: 1080 },
    { name: "1648x928-reference", width: 1648, height: 928 },
    { name: "1366x768", width: 1366, height: 768 },
    { name: "768x1024-tablet", width: 768, height: 1024 },
    { name: "390x844-mobile", width: 390, height: 844, isMobile: true }
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.isMobile || false
    });
    const page = await context.newPage();

    // 1. Default gallery state - Video
    await page.goto("http://localhost:4173/index.html#video");
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, `${vp.name}-01-default-video.png`),
      fullPage: false
    });

    // Se for viewport de referência, capturar hover, filtros e outras categorias
    if (vp.name === "1648x928-reference") {
      // Hover em Aesthetic Gym
      const aestheticCard = page.locator('.masonry-item:has-text("Aesthetic")').first();
      if (await aestheticCard.count() > 0) {
        await aestheticCard.hover();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(outDir, `${vp.name}-02-hover-aesthetic.png`),
          fullPage: false
        });
      }

      // Active filter state (clica em fitness)
      const fitnessBtn = page.locator('#sub-nav .sub-btn[data-subfilter="fitness"]');
      if (await fitnessBtn.count() > 0) {
        await fitnessBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(outDir, `${vp.name}-03-active-filter-fitness.png`),
          fullPage: false
        });
      }

      // Design Gallery
      await page.goto("http://localhost:4173/index.html#design");
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(outDir, `${vp.name}-04-gallery-design.png`),
        fullPage: false
      });

      // AI Gallery
      await page.goto("http://localhost:4173/index.html#ia");
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(outDir, `${vp.name}-05-gallery-ia.png`),
        fullPage: false
      });

      // Video Lightbox
      await page.goto("http://localhost:4173/index.html#video");
      await page.waitForTimeout(500);
      const firstCard = page.locator(".masonry-item").first();
      await firstCard.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(outDir, `${vp.name}-06-video-lightbox.png`),
        fullPage: false
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(outDir, `${vp.name}-07-lightbox-closed.png`),
        fullPage: false
      });
    }

    await context.close();
  }

  await browser.close();
  console.log("Validation screenshots captured successfully in:", outDir);
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
