/**
 * Componente de Comparação Interativa Antes / Depois (Before-and-After)
 * Suporta Pointer Events (Mouse + Touch) e acessibilidade via teclado (slider role).
 */
import { escapeHtml } from "../utils/security";

export interface BeforeAfterOptions {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  alt?: string;
}

export function createBeforeAfterComponent(options: BeforeAfterOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "before-after-container";
  container.setAttribute("role", "slider");
  container.setAttribute("aria-label", options.alt || "Comparação antes e depois");
  container.setAttribute("aria-valuemin", "0");
  container.setAttribute("aria-valuemax", "100");
  container.setAttribute("aria-valuenow", "50");
  container.tabIndex = 0;

  const beforeLabel = options.beforeLabel || "Antes";
  const afterLabel = options.afterLabel || "Depois";

  container.innerHTML = `
    <div class="ba-image-layer ba-after-layer">
      <img src="${escapeHtml(options.afterUrl)}" alt="${escapeHtml(afterLabel)}" loading="lazy" />
      <span class="ba-badge ba-badge-after">${escapeHtml(afterLabel)}</span>
    </div>
    <div class="ba-image-layer ba-before-layer" style="clip-path: inset(0 50% 0 0);">
      <img src="${escapeHtml(options.beforeUrl)}" alt="${escapeHtml(beforeLabel)}" loading="lazy" />
      <span class="ba-badge ba-badge-before">${escapeHtml(beforeLabel)}</span>
    </div>
    <div class="ba-handle" style="left: 50%;">
      <div class="ba-handle-line"></div>
      <div class="ba-handle-button" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
          <polyline points="9 18 3 12 9 6"></polyline>
        </svg>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
          <polyline points="15 18 21 12 15 6"></polyline>
        </svg>
      </div>
    </div>
  `;

  const beforeLayer = container.querySelector<HTMLElement>(".ba-before-layer");
  const handle = container.querySelector<HTMLElement>(".ba-handle");

  let currentPercent = 50;

  const updatePosition = (percent: number) => {
    const clamped = Math.max(0, Math.min(100, percent));
    currentPercent = clamped;
    container.setAttribute("aria-valuenow", String(Math.round(clamped)));
    if (beforeLayer) {
      beforeLayer.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
    }
    if (handle) {
      handle.style.left = `${clamped}%`;
    }
  };

  let isDragging = false;

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    updatePosition(percent);
  };

  const onPointerUp = () => {
    isDragging = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  container.addEventListener("pointerdown", (e: PointerEvent) => {
    isDragging = true;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    updatePosition((x / rect.width) * 100);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });

  // Acessibilidade por Teclado: Setas esquerda/direita, Home, End
  container.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      updatePosition(currentPercent - 5);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      updatePosition(currentPercent + 5);
    } else if (e.key === "Home") {
      e.preventDefault();
      updatePosition(0);
    } else if (e.key === "End") {
      e.preventDefault();
      updatePosition(100);
    }
  });

  return container;
}
