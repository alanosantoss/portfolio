import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { execSync } from "child_process";

async function main() {
  const outputDir = path.resolve(process.cwd(), "artifacts/circular-morph-recordings");
  const tempDir = path.join(outputDir, "raw");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const distDir = path.resolve(process.cwd(), "dist");
  const port = 8099;

  // Simple static file server
  const server = http.createServer((req, res) => {
    let reqPath = req.url?.split("?")[0] || "/";
    if (reqPath === "/") reqPath = "/index.html";
    const filePath = path.join(distDir, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".svg": "image/svg+xml"
      };
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`Production server running at http://localhost:${port}`);

  const browser = await chromium.launch();

  console.log("Recording Desktop click on Design card...");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: tempDir, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:${port}/index.html`);

  const skipBtn = page.locator("#intro-skip-btn");
  await skipBtn.waitFor({ state: "visible" });
  await page.waitForTimeout(300);
  await skipBtn.click();

  const welcomeGate = page.locator("#welcome-gate");
  await welcomeGate.waitFor({ state: "visible" });
  await page.waitForTimeout(600);

  const designBtn = page.locator('[data-welcome-cat="design"]');
  const box = await designBtn.boundingBox();
  if (box) {
    // Click off-center to highlight exact pointer coordinate morphing
    await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.4);
  } else {
    await designBtn.click();
  }

  await page.waitForTimeout(1800);
  await context.close();

  const webmFiles = fs.readdirSync(tempDir).filter(f => f.endsWith(".webm"));
  const latestWebm = webmFiles.sort((a, b) => {
    return fs.statSync(path.join(tempDir, b)).mtimeMs - fs.statSync(path.join(tempDir, a)).mtimeMs;
  })[0];

  const rawVideoPath = path.join(tempDir, latestWebm);
  const normalVideoPath = path.join(outputDir, "circular-morph-normal.mp4");
  const slowVideoPath = path.join(outputDir, "circular-morph-slowmotion-0.3x.mp4");

  console.log("Generating normal-speed MP4...");
  try {
    execSync(`ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -pix_fmt yuv420p "${normalVideoPath}"`, { stdio: "inherit" });
    console.log("Generating slow-motion (0.3x speed / 3.33x duration) MP4...");
    execSync(`ffmpeg -y -i "${normalVideoPath}" -vf "setpts=3.333*PTS" -c:v libx264 -pix_fmt yuv420p "${slowVideoPath}"`, { stdio: "inherit" });
  } catch (e) {
    console.error("FFmpeg error:", e);
  }

  await browser.close();
  server.close();
  console.log("Done! Videos created at:", normalVideoPath, slowVideoPath);
}

main().catch(console.error);
