import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

async function capture() {
  const outDir = path.resolve("artifacts/editorial-design-audit");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop - 1440x900 (Widescreen Editorial)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await desktopContext.newPage();

  // Video category
  await page.goto("http://localhost:4173/index.html#video");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, "editorial-desktop-video.png"), fullPage: false });

  // Design category
  await page.goto("http://localhost:4173/index.html#design");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, "editorial-desktop-design.png"), fullPage: false });

  // AI category
  await page.goto("http://localhost:4173/index.html#ia");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, "editorial-desktop-ia.png"), fullPage: false });

  await desktopContext.close();

  // 2. Mobile - 390x844 (iPhone 12/13/14)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:4173/index.html#video");
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(outDir, "editorial-mobile-video.png"), fullPage: false });
  await mobileContext.close();

  await browser.close();
  console.log("Screenshots captured in:", outDir);
}

capture().catch(console.error);
