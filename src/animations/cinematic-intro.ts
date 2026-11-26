import { INTRO_STATES, type IntroState } from "../types/app";
import type { ProjectItem } from "../types/project";

export interface CinematicIntroOptions {
  projects: ProjectItem[];
  onStateChange: (state: IntroState) => void;
  onComplete: () => void;
}

const PHASE = {
  line: 0.28,
  window: 0.68,
  reel: 1.78,
  brand: 2.12,
  morph: 2.92,
  end: 3.42
} as const;

const clamp = (x: number): number => Math.max(0, Math.min(1, x));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const segment = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));

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
const revealEase = bezier(0.16, 1, 0.3, 1);
const reelEase = bezier(0.44, 0.04, 0.22, 1);
const smoothEase = bezier(0.4, 0, 0.2, 1);

let activeRafId = 0;

export function killCinematicIntro(): void {
  if (activeRafId) {
    cancelAnimationFrame(activeRafId);
    activeRafId = 0;
  }
}

export function ensureIntroOverlayDom(): HTMLElement {
  let overlay = document.getElementById("intro-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "intro-overlay";
    overlay.className = "intro-overlay";
    overlay.innerHTML = `
      <button type="button" id="intro-skip-btn" class="intro-skip-btn" aria-label="Pular abertura">Pular abertura</button>
      <div id="morph-surface" class="intro-window">
        <div id="reel-mask" class="intro-reel-mask">
          <div id="reel-track" class="intro-reel-track"></div>
          <div id="reel-shade" class="intro-reel-shade"></div>
        </div>
      </div>
      <span id="brand" class="intro-brand">Alan Oliveira</span>
    `;
    const header = document.querySelector(".site-header");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(overlay, header);
    } else {
      document.body.prepend(overlay);
    }
  }
  return overlay;
}

export function runCinematicIntro(options: CinematicIntroOptions): void {
  const rootEl = document.documentElement;
  const overlay = ensureIntroOverlayDom();
  const shell = (document.getElementById("morph-surface") || document.getElementById("intro-window")) as HTMLElement | null;
  const mask = (document.getElementById("reel-mask") || document.getElementById("intro-reel-mask")) as HTMLElement | null;
  const track = (document.getElementById("reel-track") || document.getElementById("intro-reel-track")) as HTMLElement | null;
  const shade = (document.getElementById("reel-shade") || document.getElementById("intro-reel-shade")) as HTMLElement | null;
  const brand = (document.getElementById("brand") || document.getElementById("intro-brand")) as HTMLElement | null;
  const backdrop = (document.getElementById("backdrop") || document.querySelector(".site-backdrop")) as HTMLElement | null;
  const gate = document.getElementById("welcome-gate");
  const welcomeCard = gate?.querySelector<HTMLElement>(".welcome-card") ?? null;
  const gateBrand = (document.getElementById("gate-brand") || welcomeCard?.querySelector<HTMLElement>(".welcome-eyebrow")) ?? null;
  const skipBtn = document.getElementById("intro-skip-btn");

  killCinematicIntro();

  let completed = false;
  const invokeCompleteOnce = () => {
    if (completed) return;
    completed = true;
    options.onComplete();
  };

  const onSkipClick = () => {
    finishGate();
  };
  skipBtn?.addEventListener("click", onSkipClick);

  const cleanupAndFallback = (_reason: string) => {
    killCinematicIntro();
    skipBtn?.removeEventListener("click", onSkipClick);
    options.onStateChange(INTRO_STATES.FALLBACK);
    rootEl.classList.remove("intro-pending", "intro-running");
    document.body.style.overflow = "";
    if (overlay) overlay.remove();
    invokeCompleteOnce();
  };

  const hasPending = rootEl.classList.contains("intro-pending");
  const hasElements = Boolean(
    overlay && shell && mask && track && shade && brand && gate && welcomeCard && gateBrand && backdrop
  );

  if (!hasPending || !hasElements || !overlay || !shell || !mask || !track || !shade || !brand || !gate || !welcomeCard || !gateBrand || !backdrop) {
    cleanupAndFallback(`shouldRun=false (pending=${String(hasPending)}, dom=${String(hasElements)})`);
    return;
  }

  // 8 frames locais do portfólio real
  const frameAssets = [
    "intro-assets/frame-0.jpg",
    "intro-assets/frame-1.jpg",
    "intro-assets/frame-2.jpg",
    "intro-assets/frame-3.jpg",
    "intro-assets/frame-4.jpg",
    "intro-assets/frame-5.jpg",
    "intro-assets/frame-6.jpg",
    "intro-assets/frame-7.jpg"
  ];

  const order = [0, 4, 1, 5, 2, 6, 3, 7];
  track.innerHTML = order
    .map(idx => `<div class="intro-reel-frame reel-frame"><img src="${frameAssets[idx]}" alt="" /></div>`)
    .join("");

  options.onStateChange(INTRO_STATES.PRELOADING);

  const revealItems = [
    welcomeCard.querySelector<HTMLElement>("#welcome-title"),
    welcomeCard.querySelector<HTMLElement>(".welcome-subtitle"),
    ...Array.from(welcomeCard.querySelectorAll<HTMLElement>(".welcome-option")),
    welcomeCard.querySelector<HTMLElement>("#welcome-skip"),
    welcomeCard.querySelector<HTMLElement>("#welcome-close")
  ].filter((el): el is HTMLElement => Boolean(el));

  const measureGeometry = () => {
    const target = welcomeCard.getBoundingClientRect();
    const label = gateBrand.getBoundingClientRect();
    const w = Math.min(220, window.innerWidth * 0.47, window.innerHeight * 0.56 * 9 / 16);
    const h = w * 16 / 9;
    mask.style.width = `${w}px`;
    mask.style.height = `${h}px`;
    Array.from(track.children).forEach((el) => {
      (el as HTMLElement).style.height = `${h}px`;
    });
    return { w, h, target, label };
  };

  const renderContent = (p: number) => {
    revealItems.forEach((el, i) => {
      const v = revealEase(clamp((p - i * 0.085) / 0.58));
      el.style.opacity = String(v);
      el.style.translate = `0 ${(1 - v) * 8}px`;
    });
  };

  const finishGate = () => {
    killCinematicIntro();
    overlay.remove();
    gate.style.visibility = "visible";
    gate.classList.add("ready", "is-open");
    gate.removeAttribute("inert");
    gate.setAttribute("aria-hidden", "false");
    rootEl.classList.remove("intro-pending", "intro-running");
    rootEl.classList.add("gate-open");

    backdrop.style.backgroundColor = "#0B0B0B";
    backdrop.style.backdropFilter = "none";
    (backdrop.style as HTMLElement["style"] & { webkitBackdropFilter?: string }).webkitBackdropFilter = "none";
    backdrop.style.pointerEvents = "auto";

    renderContent(1);
    gateBrand.style.opacity = "1";
    revealItems.forEach(el => {
      el.style.opacity = "";
      el.style.translate = "";
    });

    const firstOpt = welcomeCard.querySelector<HTMLElement>(".welcome-option");
    if (firstOpt && typeof firstOpt.focus === "function") {
      firstOpt.focus({ preventScroll: true });
    }

    rootEl.dataset.phase = "7-gate-ready";
    options.onStateChange(INTRO_STATES.GATE_READY);
    invokeCompleteOnce();
  };

  const startSequence = () => {
    try {
      options.onStateChange(INTRO_STATES.INTRO_RUNNING);
      rootEl.classList.add("intro-running");
      rootEl.classList.remove("gate-open");

      overlay.style.display = "block";
      overlay.style.visibility = "visible";
      gate.style.visibility = "hidden";
      gate.setAttribute("aria-hidden", "true");
      gate.setAttribute("inert", "");
      welcomeCard.style.opacity = "1";
      welcomeCard.style.transform = "none";
      backdrop.style.pointerEvents = "auto";

      let geom = measureGeometry();
      const frameCount = order.length;
      let morphNotified = false;

      const renderFrame = (t: number) => {
        if (t < PHASE.line) {
          rootEl.dataset.phase = "1-line";
        } else if (t < PHASE.window) {
          rootEl.dataset.phase = "2-window";
        } else if (t < PHASE.reel) {
          rootEl.dataset.phase = "3-reel";
        } else if (t < PHASE.brand) {
          rootEl.dataset.phase = "4-brand";
        } else if (t < PHASE.morph) {
          rootEl.dataset.phase = "5-morph";
        } else if (t < PHASE.end) {
          rootEl.dataset.phase = "6-gate-content";
        }

        const { w, h, target, label } = geom;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const line = revealEase(segment(t, 0, PHASE.line));
        const vertical = morphEase(segment(t, PHASE.line, PHASE.window));
        const r = reelEase(segment(t, PHASE.line + 0.14, PHASE.reel));
        const fade = smoothEase(segment(t, PHASE.reel - 0.16, PHASE.brand - 0.04));
        const m = morphEase(segment(t, PHASE.brand, PHASE.morph));
        const handoff = t >= PHASE.morph;

        if (t >= PHASE.brand && !morphNotified) {
          morphNotified = true;
          options.onStateChange(INTRO_STATES.MORPHING_TO_GATE);
        }

        const width = t < PHASE.line ? mix(2, w, line) : mix(w, target.width, m);
        const height = t < PHASE.line ? 2 : mix(mix(2, h, vertical), target.height, m);

        shell.style.left = `${mix(cx, target.left + target.width / 2, m)}px`;
        shell.style.top = `${mix(cy, target.top + target.height / 2, m)}px`;
        shell.style.width = `${width}px`;
        shell.style.height = `${height}px`;
        shell.style.opacity = t < PHASE.line ? String(clamp(t / 0.08)) : "1";

        const bgTone = Math.round(mix(255, 22, clamp(vertical * 5)));
        shell.style.backgroundColor = t < PHASE.line ? "#ffffff" : `rgb(${bgTone}, ${bgTone}, ${bgTone})`;
        shell.style.borderRadius = `${mix(vertical * 4, 16, m)}px`;
        shell.style.borderWidth = m > 0.001 ? "1px" : "0";
        shell.style.borderColor = `rgba(255, 255, 255, ${m * 0.1})`;

        mask.style.opacity = String(revealEase(segment(t, PHASE.line, PHASE.line + 0.18)) * (1 - fade));
        track.style.transform = `translate3d(0, ${-r * h * (frameCount - 1)}px, 0)`;
        shade.style.opacity = String(1 - fade);

        const b = revealEase(segment(t, 0.45, 0.8));
        const br = m;
        brand.style.opacity = String(b);
        brand.style.left = `${mix(cx, label.left + label.width / 2, br)}px`;
        brand.style.top = `${mix(cy, label.top + label.height / 2, br)}px`;
        brand.style.fontSize = `${mix(19, 13, br)}px`;
        const c = Math.round(mix(250, 161, Math.max(fade, br)));
        brand.style.color = `rgb(${c}, ${c}, ${c})`;
        brand.style.textShadow = br > 0.95 ? "none" : "0 1px 12px rgba(0, 0, 0, 0.5)";

        const bg = smoothEase(segment(t, PHASE.brand + 0.02, PHASE.morph));
        const tone = Math.round(mix(18, 11, bg));
        backdrop.style.backgroundColor = `rgb(${tone}, ${tone}, ${tone})`;
        backdrop.style.backdropFilter = "none";
        (backdrop.style as HTMLElement["style"] & { webkitBackdropFilter?: string }).webkitBackdropFilter = "none";

        // Handoff sem piscar (zero-flicker handoff):
        // Mantém a superfície do morph ativa por baixo do modal enquanto o conteúdo faz fade-in.
        gate.style.visibility = handoff ? "visible" : "hidden";
        gateBrand.style.opacity = "1";

        if (handoff) {
          overlay.style.visibility = "visible";
          brand.style.opacity = "0";
          if (skipBtn) {
            skipBtn.style.opacity = "0";
            skipBtn.style.pointerEvents = "none";
          }
        } else {
          overlay.style.visibility = "visible";
          if (skipBtn) {
            skipBtn.style.opacity = "";
            skipBtn.style.pointerEvents = "";
          }
        }

        renderContent(segment(t, PHASE.morph, PHASE.end));
      };

      const onResize = () => {
        geom = measureGeometry();
      };
      window.addEventListener("resize", onResize, { passive: true });

      // Exposição de QA para Playwright
      (window as unknown as { introDemo: unknown }).introDemo = {
        seek(t: number) {
          killCinematicIntro();
          overlay.style.display = "block";
          welcomeCard.style.opacity = "1";
          welcomeCard.style.transform = "none";
          geom = measureGeometry();
          renderFrame(clamp(t / PHASE.end) * PHASE.end);
          if (t >= PHASE.end) finishGate();
        },
        duration: PHASE.end
      };

      renderFrame(0);
      let elapsed = 0;
      let previousFrame: number | null = null;

      const tick = (now: number) => {
        if (document.hidden) {
          previousFrame = null;
          activeRafId = requestAnimationFrame(tick);
          return;
        }
        if (previousFrame === null) {
          previousFrame = now;
          activeRafId = requestAnimationFrame(tick);
          return;
        }
        const delta = Math.min(50, Math.max(0, now - previousFrame));
        previousFrame = now;
        elapsed = Math.min(PHASE.end, elapsed + delta / 1000);
        renderFrame(elapsed);

        if (elapsed >= PHASE.end) {
          window.removeEventListener("resize", onResize);
          finishGate();
        } else {
          activeRafId = requestAnimationFrame(tick);
        }
      };

      activeRafId = requestAnimationFrame(tick);
    } catch (err) {
      cleanupAndFallback(`render_error: ${String(err)}`);
    }
  };

  const imageWarmers = Array.from(track.querySelectorAll("img")).map(img =>
    img.decode ? img.decode().catch(() => {}) : Promise.resolve()
  );

  Promise.allSettled(imageWarmers).then(() => {
    startSequence();
  });
}

