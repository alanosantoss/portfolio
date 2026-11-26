import { INTRO_STATES, type IntroState } from "../types/app";

export interface GalleryRevealOptions {
  triggerElement: HTMLElement | null;
  clickCoords?: { x: number; y: number } | null;
  onStateChange: (state: IntroState) => void;
  onPrepareDestination: () => void;
  onComplete: () => void;
}

const clamp = (v: number, min = 0, max = 1): number => Math.min(max, Math.max(min, v));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  return (x: number) => {
    const cx = clamp(x);
    let lo = 0;
    let hi = 1;
    const b = (t: number, a: number, c: number) =>
      3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * c + t * t * t;
    for (let i = 0; i < 15; i++) {
      const m = (lo + hi) / 2;
      if (b(m, x1, x2) < cx) lo = m;
      else hi = m;
    }
    return b((lo + hi) / 2, y1, y2);
  };
}

const morphEase = bezier(0.76, 0, 0.24, 1);
const smoothEase = bezier(0.4, 0, 0.2, 1);

let activeRevealRaf = 0;

export function killGalleryReveal(): void {
  if (activeRevealRaf) {
    cancelAnimationFrame(activeRevealRaf);
    activeRevealRaf = 0;
  }
}

export function runGalleryReveal(options: GalleryRevealOptions): void {
  killGalleryReveal();

  const gate = document.getElementById("welcome-gate");
  const card = gate?.querySelector<HTMLElement>(".welcome-card") ?? null;
  const backdrop = document.getElementById("backdrop") || document.querySelector<HTMLElement>(".site-backdrop");
  const rootEl = document.documentElement;

  if (!gate || !card) {
    options.onPrepareDestination();
    options.onComplete();
    return;
  }

  options.onStateChange(INTRO_STATES.AREA_TRANSITION);
  rootEl.classList.add("gate-transitioning");

  // 1. Coordenadas do centro do clique
  const cardRect = card.getBoundingClientRect();
  const triggerRect = options.triggerElement?.getBoundingClientRect() ?? {
    left: cardRect.left + cardRect.width / 2 - 100,
    top: cardRect.top + cardRect.height / 2 - 50,
    width: 200,
    height: 100
  };

  const clickX = options.clickCoords && (options.clickCoords.x > 0 || options.clickCoords.y > 0)
    ? options.clickCoords.x
    : triggerRect.left + triggerRect.width / 2;

  const clickY = options.clickCoords && (options.clickCoords.x > 0 || options.clickCoords.y > 0)
    ? options.clickCoords.y
    : triggerRect.top + triggerRect.height / 2;

  // 2. Prepara a categoria de destino imediatamente
  options.onPrepareDestination();

  // 3. Highlight sutil no botão clicado
  if (options.triggerElement) {
    options.triggerElement.classList.add("is-selected");
  }

  // 4. Cria a superfície sólida de contração (Welcome Gate morphing em direção ao clique)
  const gateComputed = window.getComputedStyle(card);
  const initialRadius = parseFloat(gateComputed.borderRadius) || 16;

  const morphSurface = document.createElement("div");
  morphSurface.id = "gate-morph-surface";
  Object.assign(morphSurface.style, {
    position: "fixed",
    left: `${cardRect.left}px`,
    top: `${cardRect.top}px`,
    width: `${cardRect.width}px`,
    height: `${cardRect.height}px`,
    borderRadius: `${initialRadius}px`,
    background: "#161616",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    zIndex: "960",
    pointerEvents: "none",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
    transform: "none",
    willChange: "left, top, width, height, border-radius, background-color"
  });
  document.body.appendChild(morphSurface);

  // Mantém backdrop totalmente opaco durante a fase de contração
  if (backdrop) {
    backdrop.style.backgroundColor = "#0B0B0B";
    backdrop.style.backdropFilter = "none";
    (backdrop.style as HTMLElement["style"] & { webkitBackdropFilter?: string }).webkitBackdropFilter = "none";
    backdrop.style.pointerEvents = "auto";
  }

  // Itens secundários do gate para fade out imediato
  const unselectedItems = [
    card.querySelector("#welcome-title"),
    card.querySelector(".welcome-subtitle"),
    card.querySelector(".welcome-eyebrow"),
    card.querySelector("#welcome-skip"),
    card.querySelector("#welcome-close"),
    ...Array.from(card.querySelectorAll<HTMLElement>(".welcome-option")).filter(
      el => el !== options.triggerElement
    )
  ].filter((el): el is HTMLElement => Boolean(el));

  // Oculta a casca original do gate para o morphSurface representá-la sem duplicidade
  card.style.opacity = "0";

  // Dimensões do pequeno círculo (32px)
  const CIRCLE_SIZE = 32;
  const smallCircleLeft = clickX - CIRCLE_SIZE / 2;
  const smallCircleTop = clickY - CIRCLE_SIZE / 2;

  // Raio máximo necessário para cobrir o canto mais distante da tela
  const maxRadius = Math.hypot(
    Math.max(clickX, window.innerWidth - clickX),
    Math.max(clickY, window.innerHeight - clickY)
  );
  const maxDiameter = maxRadius * 2;

  let aperture: HTMLElement | null = null;
  let apertureCreated = false;

  const startAt = performance.now();
  const CONTRACTION_DURATION = 420; // 0.00s -> 0.42s contração até o ponto do clique
  const EXPANSION_DURATION = 680;   // 0.42s -> 1.10s expansão radial da abertura
  const TOTAL_DURATION = CONTRACTION_DURATION + EXPANSION_DURATION;

  const tick = (now: number) => {
    const elapsed = now - startAt;
    const pTotal = clamp(elapsed / TOTAL_DURATION);

    // Fade out de itens secundários (0.00s - 0.20s)
    if (elapsed <= 200) {
      const pFade = smoothEase(clamp(elapsed / 200));
      unselectedItems.forEach(el => {
        el.style.opacity = String(1 - pFade);
      });
    }

    // Fade out do texto/conteúdo do card selecionado durante a contração (0.15s - 0.35s)
    if (elapsed >= 150 && elapsed <= 350 && options.triggerElement) {
      const pText = clamp((elapsed - 150) / 200);
      Array.from(options.triggerElement.children).forEach(child => {
        (child as HTMLElement).style.opacity = String(1 - pText);
      });
    }

    if (elapsed < CONTRACTION_DURATION) {
      // -------------------------------------------------------------
      // FASE 1: CONTRAÇÃO GEOMÉTRICA EM DIREÇÃO AO PONTO DO CLIQUE
      // -------------------------------------------------------------
      const pContract = morphEase(clamp(elapsed / CONTRACTION_DURATION));

      const curLeft = mix(cardRect.left, smallCircleLeft, pContract);
      const curTop = mix(cardRect.top, smallCircleTop, pContract);
      const curWidth = mix(cardRect.width, CIRCLE_SIZE, pContract);
      const curHeight = mix(cardRect.height, CIRCLE_SIZE, pContract);
      const curRadius = mix(initialRadius, CIRCLE_SIZE / 2, pContract);

      morphSurface.style.left = `${curLeft.toFixed(1)}px`;
      morphSurface.style.top = `${curTop.toFixed(1)}px`;
      morphSurface.style.width = `${curWidth.toFixed(1)}px`;
      morphSurface.style.height = `${curHeight.toFixed(1)}px`;
      morphSurface.style.borderRadius = `${curRadius.toFixed(1)}px`;
    } else {
      // -------------------------------------------------------------
      // FASE 2: TRANSIÇÃO PARA ABERTURA CIRCULAR TRANSPARENTE E EXPANSÃO RADIAL
      // -------------------------------------------------------------
      if (!apertureCreated) {
        apertureCreated = true;

        // Oculta completamente o gate da árvore acessível e interativa
        gate.style.visibility = "hidden";
        gate.setAttribute("aria-hidden", "true");
        gate.setAttribute("inert", "");

        // Remove a superfície sólida de contração
        morphSurface.remove();

        // Cria a abertura circular transparente com inverse shadow mask
        aperture = document.createElement("div");
        aperture.id = "gallery-aperture";
        aperture.className = "gallery-aperture";
        Object.assign(aperture.style, {
          position: "fixed",
          left: `${smallCircleLeft.toFixed(1)}px`,
          top: `${smallCircleTop.toFixed(1)}px`,
          width: `${CIRCLE_SIZE}px`,
          height: `${CIRCLE_SIZE}px`,
          borderRadius: "50%",
          background: "transparent",
          boxShadow: "0 0 0 200vmax #0b0b0b",
          pointerEvents: "none",
          zIndex: "9999",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          willChange: "left, top, width, height, border-color"
        });
        document.body.appendChild(aperture);

        // Remove o backdrop no mesmo frame de renderização
        if (backdrop) {
          backdrop.style.backgroundColor = "transparent";
          backdrop.style.backdropFilter = "none";
          (backdrop.style as HTMLElement["style"] & { webkitBackdropFilter?: string }).webkitBackdropFilter = "none";
          backdrop.style.pointerEvents = "none";
        }
      }

      const pExpand = morphEase(clamp((elapsed - CONTRACTION_DURATION) / EXPANSION_DURATION));

      const curDiameter = mix(CIRCLE_SIZE, maxDiameter, pExpand);
      const curLeft = clickX - curDiameter / 2;
      const curTop = clickY - curDiameter / 2;

      // Dissolve a borda suavemente à medida que a abertura cobre a tela
      const borderAlpha = 0.4 * (1 - clamp((pExpand - 0.7) / 0.3));

      if (aperture) {
        aperture.style.left = `${curLeft.toFixed(1)}px`;
        aperture.style.top = `${curTop.toFixed(1)}px`;
        aperture.style.width = `${curDiameter.toFixed(1)}px`;
        aperture.style.height = `${curDiameter.toFixed(1)}px`;
        aperture.style.borderColor = `rgba(255, 255, 255, ${borderAlpha.toFixed(3)})`;
      }
    }

    if (pTotal < 1) {
      activeRevealRaf = requestAnimationFrame(tick);
    } else {
      // -------------------------------------------------------------
      // FASE 3: CONCLUSÃO DA TRANSIÇÃO
      // -------------------------------------------------------------
      activeRevealRaf = 0;
      if (aperture) aperture.remove();
      morphSurface.remove();

      gate.style.visibility = "hidden";
      gate.classList.remove("is-open", "ready");
      gate.setAttribute("aria-hidden", "true");
      gate.setAttribute("inert", "");

      // Restaura estilos inline do gate
      card.style.opacity = "";
      card.style.backgroundColor = "";
      card.style.borderColor = "";
      unselectedItems.forEach(el => {
        el.style.opacity = "";
      });
      if (options.triggerElement) {
        options.triggerElement.classList.remove("is-selected");
        Array.from(options.triggerElement.children).forEach(child => {
          (child as HTMLElement).style.opacity = "";
        });
      }

      rootEl.classList.remove("gate-open", "intro-running", "intro-pending", "gate-transitioning");
      document.body.style.overflow = "";

      options.onStateChange(INTRO_STATES.PORTFOLIO_READY);
      options.onComplete();
    }
  };

  activeRevealRaf = requestAnimationFrame(tick);
}
