import { INTRO_CONFIG } from "../core/config";
import { getIntroFrameUrls } from "../services/projects";
import { INTRO_STATES, type IntroState } from "../types/app";
import type { ProjectItem } from "../types/project";
import { prefersReducedMotion } from "../utils/media";
import { preloadIntroFrames, waitForFonts } from "../utils/preload";
import { escapeHtml } from "../utils/security";
import { registerIntroEases } from "./easing";
import { gsap } from "./gsap";

export interface CinematicIntroOptions {
  projects: ProjectItem[];
  onStateChange: (state: IntroState) => void;
  onComplete: () => void;
}

let activeIntroTimeline: gsap.core.Timeline | null = null;

function startVisibleAutoplayVideos(): void {
  document.querySelectorAll("video[autoplay], video[data-autoplay='true']").forEach((el) => {
    const vid = el as HTMLVideoElement;
    if (typeof vid.play === "function") {
      vid.muted = true;
      vid.play().catch(() => {});
    }
  });
}

export function killCinematicIntro(): void {
  if (activeIntroTimeline) {
    activeIntroTimeline.kill();
    activeIntroTimeline = null;
  }
}

export function runCinematicIntro(options: CinematicIntroOptions): void {
  const rootEl = document.documentElement;
  const overlay = document.getElementById("intro-overlay");
  const lineEl = document.getElementById("intro-line");
  const winEl = document.getElementById("intro-window");
  const trackEl = document.getElementById("intro-reel-track");
  const introBrandEl = document.getElementById("intro-brand");
  const gate = document.getElementById("welcome-gate");
  const welcomeCard = gate?.querySelector<HTMLElement>(".welcome-card") ?? null;

  killCinematicIntro();

  let completed = false;
  const invokeCompleteOnce = () => {
    if (completed) return;
    completed = true;
    options.onComplete();
  };

  const cleanupAndFallback = () => {
    options.onStateChange(INTRO_STATES.FALLBACK);
    rootEl.classList.remove("intro-pending");
    document.body.style.overflow = "";
    overlay?.remove();
    if (gate) {
      gsap.set(gate, { clearProps: "all" });
    }
    startVisibleAutoplayVideos();
    invokeCompleteOnce();
  };

  const shouldRun =
    rootEl.classList.contains("intro-pending") &&
    !prefersReducedMotion() &&
    Boolean(overlay && lineEl && winEl && trackEl && introBrandEl && gate && welcomeCard);

  if (!shouldRun || !overlay || !lineEl || !winEl || !trackEl || !introBrandEl || !gate || !welcomeCard) {
    cleanupAndFallback();
    return;
  }

  registerIntroEases();

  const frameUrls = getIntroFrameUrls(options.projects, INTRO_CONFIG.frameCount);
  trackEl.innerHTML = frameUrls
    .map((url) => `<div class="intro-reel-frame"><img src="${escapeHtml(url)}" alt="" /></div>`)
    .join("");

  options.onStateChange(INTRO_STATES.PRELOADING);

  const startSequence = () => {
    try {
      options.onStateChange(INTRO_STATES.INTRO_RUNNING);

      // Mede a geometria real do painel interno de #welcome-gate sem exibi-lo
      gate.style.visibility = "hidden";
      gate.style.opacity = "0";
      gate.style.pointerEvents = "none";
      gate.classList.add("is-open");
      const targetRect = welcomeCard.getBoundingClientRect();
      const eyebrowEl = welcomeCard.querySelector<HTMLElement>(".welcome-eyebrow");
      const eyebrowRect = eyebrowEl ? eyebrowEl.getBoundingClientRect() : null;
      gate.classList.remove("is-open");
      gate.style.visibility = "";
      gate.style.opacity = "";
      gate.style.pointerEvents = "";

      const winRect = winEl.getBoundingClientRect();
      const trackDistance = Math.max(0, trackEl.scrollHeight - winRect.height);

      const modalContent = [
        welcomeCard.querySelector("#welcome-title"),
        welcomeCard.querySelector(".welcome-subtitle"),
        ...welcomeCard.querySelectorAll(".welcome-option"),
        welcomeCard.querySelector("#welcome-skip"),
        welcomeCard.querySelector("#welcome-close")
      ].filter((el): el is HTMLElement => Boolean(el));

      const P = INTRO_CONFIG.phases;

      const tl = gsap.timeline({
        onComplete: () => {
          rootEl.classList.remove("intro-pending");
          gate.classList.add("is-open");
          gsap.set([gate, welcomeCard, eyebrowEl, ...modalContent].filter(Boolean), {
            clearProps: "all"
          });
          overlay.remove();
          activeIntroTimeline = null;
          options.onStateChange(INTRO_STATES.GATE_READY);
          startVisibleAutoplayVideos();
          invokeCompleteOnce();
        }
      });

      activeIntroTimeline = tl;

      // Fase A — Initial line (0.00 - 0.30s)
      tl.fromTo(
        lineEl,
        { scaleX: 0, opacity: 1, width: INTRO_CONFIG.lineWidth },
        { scaleX: 1, duration: P.lineDuration, ease: "introReveal" },
        P.lineStart
      );

      // Fase B — Vertical reveal (0.30 - 0.65s)
      tl.to(
        winEl,
        {
          opacity: 1,
          clipPath: "inset(0% 0 0% 0 round 12px)",
          duration: P.revealDuration,
          ease: "introMorph"
        },
        P.revealStart
      );
      tl.to(lineEl, { opacity: 0, duration: 0.15, ease: "power2.out" }, P.revealStart + 0.05);

      // Fase C — Project reel (0.65 - 1.60s)
      if (trackDistance > 0) {
        tl.to(
          trackEl,
          {
            y: -trackDistance,
            duration: P.reelDuration,
            ease: "introReel"
          },
          P.reelStart
        );
      }

      // Fase D — Brand reveal (1.60 - 1.95s)
      tl.to(trackEl, { opacity: 0, duration: P.brandDuration, ease: "power2.inOut" }, P.brandStart);
      tl.to(
        winEl,
        { backgroundColor: "#161616", duration: P.brandDuration, ease: "power2.inOut" },
        P.brandStart
      );
      tl.fromTo(
        introBrandEl,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: P.brandDuration, ease: "introReveal" },
        P.brandStart + 0.05
      );

      // Fase E — Geometry morph para a caixa real de #welcome-gate (1.95 - 2.65s)
      tl.add(() => {
        options.onStateChange(INTRO_STATES.MORPHING_TO_GATE);
      }, P.morphStart);
      tl.set(
        winEl,
        {
          left: winRect.left,
          top: winRect.top,
          width: winRect.width,
          height: winRect.height,
          xPercent: 0,
          yPercent: 0,
          transform: "none",
          maxHeight: "none"
        },
        P.morphStart
      );

      tl.to(
        winEl,
        {
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          duration: P.morphDuration,
          ease: "introMorph"
        },
        P.morphStart
      );

      if (eyebrowRect) {
        const brandCenterY = window.innerHeight / 2;
        const targetCenterY = eyebrowRect.top + eyebrowRect.height / 2;
        tl.to(
          introBrandEl,
          {
            y: targetCenterY - brandCenterY,
            duration: P.morphDuration,
            ease: "introMorph"
          },
          P.morphStart
        );
      }

      // Fase F — Backdrop reveal simultâneo (2.10 - 2.65s)
      tl.to(
        overlay,
        {
          backgroundColor: "rgba(11, 11, 11, 0.92)",
          backdropFilter: "blur(12px)",
          duration: P.backdropDuration,
          ease: "power2.out"
        },
        P.backdropStart
      );

      // Fase G — Modal content reveal (2.55 - 3.00s)
      tl.set(gate, { opacity: 1, visibility: "visible", pointerEvents: "none" }, P.contentStart);
      tl.set(welcomeCard, { opacity: 1, transform: "none" }, P.contentStart);
      if (eyebrowEl) {
        tl.set(eyebrowEl, { opacity: 1 }, P.contentStart);
      }
      tl.set(introBrandEl, { opacity: 0 }, P.contentStart);
      tl.set(winEl, { opacity: 0 }, P.contentStart + 0.04);

      tl.fromTo(
        modalContent,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: P.contentDuration,
          stagger: P.contentStagger,
          ease: "introReveal"
        },
        P.contentStart
      );
    } catch {
      cleanupAndFallback();
    }
  };

  Promise.all([
    preloadIntroFrames(frameUrls, INTRO_CONFIG.preloadTimeoutMs),
    waitForFonts(INTRO_CONFIG.fontTimeoutMs)
  ])
    .then(startSequence)
    .catch(cleanupAndFallback);
}
