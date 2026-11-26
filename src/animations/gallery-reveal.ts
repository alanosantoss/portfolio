import { INTRO_STATES, type IntroState } from "../types/app";

export interface GalleryRevealOptions {
  triggerElement: HTMLElement | null;
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

  // 1. Geometria do elemento clicado (ou fallback centralizado)
  const rect = options.triggerElement
    ? options.triggerElement.getBoundingClientRect()
    : {
        left: window.innerWidth / 2 - 160,
        top: window.innerHeight / 2 - 60,
        right: window.innerWidth / 2 + 160,
        bottom: window.innerHeight / 2 + 60,
        width: 320,
        height: 120
      };

  const computedStyle = options.triggerElement ? window.getComputedStyle(options.triggerElement) : null;
  const initialRadius = computedStyle ? parseFloat(computedStyle.borderRadius) || 12 : 12;

  // 2. Prepara o destino (atualiza categoria, renderiza galeria final)
  options.onPrepareDestination();

  // 3. Fase A: Highlight sutil no elemento clicado
  if (options.triggerElement) {
    options.triggerElement.classList.add("is-selected");
  }

  // 4. Cria superfície de transição isolada (Shared element)
  const sharedClone = document.createElement("div");
  sharedClone.id = "shared-card-aperture";
  Object.assign(sharedClone.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: `${initialRadius}px`,
    background: "#232323",
    border: "1px solid rgba(255, 255, 255, 0.45)",
    zIndex: "960",
    pointerEvents: "none",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.5)"
  });
  document.body.appendChild(sharedClone);

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

  const startAt = performance.now();
  const TOTAL_DURATION = 1100; // 1.1s total

  let apertureInitiated = false;

  const tick = (now: number) => {
    const elapsed = now - startAt;
    const p = clamp(elapsed / TOTAL_DURATION);

    // Fase B (0.10s - 0.30s): Fade out de itens secundários e do card do gate
    if (elapsed >= 100) {
      const pB = smoothEase(clamp((elapsed - 100) / 200));
      unselectedItems.forEach(el => {
        el.style.opacity = String(1 - pB);
      });
      card.style.backgroundColor = `rgba(22, 22, 22, ${1 - pB})`;
      card.style.borderColor = `rgba(255, 255, 255, ${0.1 * (1 - pB)})`;
    }

    // Fase C (0.25s - 0.45s): Fade out do texto do card selecionado
    if (elapsed >= 250 && elapsed < 450 && options.triggerElement) {
      const pC = clamp((elapsed - 250) / 150);
      Array.from(options.triggerElement.children).forEach(child => {
        (child as HTMLElement).style.opacity = String(1 - pC);
      });
    }

    // Fase D (0.35s - 0.95s): Expansão da janela de revelação
    if (elapsed >= 350) {
      if (!apertureInitiated) {
        apertureInitiated = true;
        gate.style.visibility = "hidden";
        gate.setAttribute("aria-hidden", "true");
        gate.setAttribute("inert", "");
      }

      const pAperture = morphEase(clamp((elapsed - 350) / 600));

      // Fade out da casca do card durante a abertura para revelar o interior
      sharedClone.style.opacity = String(1 - clamp((pAperture - 0.04) / 0.16));

      // Interpolação dos 4 insets do backdrop opaco até 0px
      const topInset = mix(rect.top, 0, pAperture);
      const rightInset = mix(window.innerWidth - rect.right, 0, pAperture);
      const bottomInset = mix(window.innerHeight - rect.bottom, 0, pAperture);
      const leftInset = mix(rect.left, 0, pAperture);
      const radius = mix(initialRadius, 0, pAperture);

      if (backdrop) {
        const clip = `inset(${topInset.toFixed(1)}px ${rightInset.toFixed(1)}px ${bottomInset.toFixed(1)}px ${leftInset.toFixed(1)}px round ${radius.toFixed(1)}px)`;
        backdrop.style.clipPath = clip;
        (backdrop.style as HTMLElement["style"] & { webkitClipPath?: string }).webkitClipPath = clip;
      }
    }

    if (p < 1) {
      activeRevealRaf = requestAnimationFrame(tick);
    } else {
      // Fase E (Conclusão): Finalização limpa
      activeRevealRaf = 0;
      sharedClone.remove();

      if (backdrop) {
        backdrop.style.clipPath = "";
        (backdrop.style as HTMLElement["style"] & { webkitClipPath?: string }).webkitClipPath = "";
        backdrop.style.pointerEvents = "none";
        backdrop.style.backgroundColor = "transparent";
        backdrop.style.backdropFilter = "none";
        (backdrop.style as HTMLElement["style"] & { webkitBackdropFilter?: string }).webkitBackdropFilter = "none";
      }

      gate.style.visibility = "hidden";
      gate.classList.remove("is-open", "ready");
      gate.setAttribute("aria-hidden", "true");
      gate.setAttribute("inert", "");

      // Restaura estilos inline de limpeza
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
