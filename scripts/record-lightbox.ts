import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { execSync } from "child_process";

async function main() {
  const outputDir = path.resolve(process.cwd(), "artifacts/lightbox-shared-element-recordings");
  const tempDir = path.join(outputDir, "raw");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const distDir = path.resolve(process.cwd(), "dist");
  const port = 8101;

  // Servidor estático para o build de produção (dist)
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

  // Teste 1: Desktop - Abertura e fechamento de vídeo na galeria
  console.log("Recording Lightbox Shared Element Transition (Desktop Open + Close)...");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: tempDir, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();
  
  // Acessa diretamente a categoria video para pular a intro do gate
  await page.goto(`http://localhost:${port}/index.html#video`);

  const firstCard = page.locator(".masonry-item").first();
  await firstCard.waitFor({ state: "visible" });
  await page.waitForTimeout(600);

  // 1. Clica no card para abrir o Lightbox com shared-element transition
  console.log("Clicking video project card...");
  await firstCard.click();

  // Aguarda transição geométrica (~450ms) + handoff + tempo de visualização
  await page.waitForTimeout(1600);

  // 2. Clica no botão de fechar para acionar o fechamento reverso de volta ao card
  console.log("Closing Lightbox...");
  const closeBtn = page.locator("#lightbox-close");
  await closeBtn.waitFor({ state: "visible" });
  await closeBtn.click();

  // Aguarda animação reversa (~350ms) e estabilização do card no grid
  await page.waitForTimeout(1200);

  await context.close();

  // Localiza o vídeo gravado
  const webmFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith(".webm"));
  const latestWebm = webmFiles.sort((a, b) => {
    return fs.statSync(path.join(tempDir, b)).mtimeMs - fs.statSync(path.join(tempDir, a)).mtimeMs;
  })[0];

  const rawVideoPath = path.join(tempDir, latestWebm);
  const normalVideoPath = path.join(outputDir, "lightbox-shared-element-normal.mp4");
  const slowVideoPath = path.join(outputDir, "lightbox-shared-element-slowmotion-0.3x.mp4");

  console.log("Generating normal-speed MP4...");
  try {
    execSync(
      `ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -pix_fmt yuv420p "${normalVideoPath}"`,
      { stdio: "inherit" }
    );
    console.log("Generating slow-motion (0.3x speed / 3.33x duration) MP4...");
    execSync(
      `ffmpeg -y -i "${normalVideoPath}" -vf "setpts=3.333*PTS" -c:v libx264 -pix_fmt yuv420p "${slowVideoPath}"`,
      { stdio: "inherit" }
    );
  } catch (e) {
    console.error("FFmpeg error:", e);
  }

  await browser.close();
  server.close();
  console.log("Done! Lightbox videos created at:\n", normalVideoPath, "\n", slowVideoPath);
}

main().catch(console.error);
