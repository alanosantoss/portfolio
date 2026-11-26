import { hasValidRect } from "../utils/dom";
import { prefersReducedMotion } from "../utils/media";
import { ensureGsapPlugins, gsap } from "./gsap";

export interface LightboxAnimationTargets {
  lightbox: HTMLElement;
  backdrop: HTMLElement | null;
  stage: HTMLElement | null;
  content: HTMLElement;
  caption: HTMLElement | null;
}

let lightboxMotionRaf: number | null = null;
let activeFlipTween: gsap.core.Tween | null = null;
let activeBackdropTween: gsap.core.Tween | null = null;
let activeCaptionTween: gsap.core.Tween | null = null;

export function cancelLightboxMotionRaf(): void {
  if (lightboxMotionRaf !== null && typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(lightboxMotionRaf);
  }
  lightboxMotionRaf = null;
}

export function killLightboxAnimations(
  targets: Partial<LightboxAnimationTargets>,
  originEl?: HTMLElement | null
): void {
  [activeFlipTween, activeBackdropTween, activeCaptionTween].forEach((tw) => {
    if (tw && typeof tw.kill === "function") tw.kill();
  });
  activeFlipTween = null;
  activeBackdropTween = null;
  activeCaptionTween = null;

  const elements = [
    targets.lightbox,
    targets.backdrop,
    targets.stage,
    targets.content,
    targets.caption,
    originEl
  ].filter(Boolean);

  if (elements.length > 0 && typeof gsap.killTweensOf === "function") {
    gsap.killTweensOf(elements);
  }
}

export function clearLightboxStageMotion(stage: HTMLElement | null): void {
  if (!stage) return;
  stage.style.transition = "";
  stage.style.transform = "";
  stage.style.opacity = "";
  stage.style.filter = "";
}

export function animateLightboxOpen(
  targets: LightboxAnimationTargets,
  originEl: HTMLElement | null
): void {
  ensureGsapPlugins();
  if (prefersReducedMotion()) {
    clearLightboxStageMotion(targets.stage);
    return;
  }

  const backdropEl = targets.backdrop || targets.lightbox;
  const originRect = hasValidRect(originEl) ? originEl.getBoundingClientRect() : null;

  if (originRect) {
    activeBackdropTween = gsap.fromTo(
      backdropEl,
      { opacity: 0 },
      { opacity: 1, duration: 0.45, ease: "power2.out" }
    );
    if (targets.caption) {
      activeCaptionTween = gsap.fromTo(
        targets.caption,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.42, delay: 0.22, ease: "power3.out" }
      );
    }

    const targetRect = targets.content.getBoundingClientRect();
    if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
      const dx = originRect.left + originRect.width / 2 - (targetRect.left + targetRect.width / 2);
      const dy = originRect.top + originRect.height / 2 - (targetRect.top + targetRect.height / 2);
      const sx = Math.max(0.25, Math.min(0.95, originRect.width / targetRect.width));
      const sy = Math.max(0.25, Math.min(0.95, originRect.height / targetRect.height));

      activeFlipTween = gsap.fromTo(
        targets.content,
        { x: dx, y: dy, scaleX: sx, scaleY: sy, opacity: 0.35 },
        {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          duration: 0.65,
          ease: "power3.out",
          clearProps: "transform,opacity",
          onComplete: () => {
            activeFlipTween = null;
          }
        }
      );
    }
    return;
  }

  activeBackdropTween = gsap.fromTo(
    backdropEl,
    { opacity: 0 },
    { opacity: 1, duration: 0.4, ease: "power2.out" }
  );
  if (targets.stage) {
    activeFlipTween = gsap.fromTo(
      targets.stage,
      { scale: 0.88, opacity: 0, y: 24 },
      { scale: 1, opacity: 1, y: 0, duration: 0.55, ease: "power3.out", clearProps: "transform" }
    );
  }
}

export function animateLightboxClose(
  targets: LightboxAnimationTargets,
  originEl: HTMLElement | null,
  onComplete: () => void
): void {
  ensureGsapPlugins();
  if (prefersReducedMotion()) {
    onComplete();
    return;
  }

  const backdropEl = targets.backdrop || targets.lightbox;
  const canUseFlipClose = hasValidRect(originEl) && hasValidRect(targets.content);

  if (canUseFlipClose && originEl) {
    const originRect = originEl.getBoundingClientRect();
    const targetRect = targets.content.getBoundingClientRect();
    const dx = originRect.left + originRect.width / 2 - (targetRect.left + targetRect.width / 2);
    const dy = originRect.top + originRect.height / 2 - (targetRect.top + targetRect.height / 2);
    const sx = Math.max(0.25, Math.min(0.95, originRect.width / Math.max(1, targetRect.width)));
    const sy = Math.max(0.25, Math.min(0.95, originRect.height / Math.max(1, targetRect.height)));

    if (targets.caption) {
      activeCaptionTween = gsap.to(targets.caption, {
        opacity: 0,
        y: 8,
        duration: 0.2,
        ease: "power2.in"
      });
    }
    activeBackdropTween = gsap.to(backdropEl, {
      opacity: 0,
      duration: 0.42,
      ease: "power2.inOut"
    });
    activeFlipTween = gsap.to(targets.content, {
      x: dx,
      y: dy,
      scaleX: sx,
      scaleY: sy,
      opacity: 0,
      duration: 0.45,
      ease: "power3.inOut",
      onComplete
    });
    return;
  }

  activeBackdropTween = gsap.to(backdropEl, {
    opacity: 0,
    duration: 0.32,
    ease: "power2.in"
  });

  if (targets.stage) {
    activeFlipTween = gsap.to(targets.stage, {
      scale: 0.9,
      opacity: 0,
      y: 16,
      duration: 0.3,
      ease: "power2.in",
      onComplete
    });
    return;
  }

  setTimeout(onComplete, 320);
}

export function animateLightboxStep(stage: HTMLElement | null, delta: number): void {
  if (!stage || prefersReducedMotion()) return;
  ensureGsapPlugins();
  gsap.fromTo(
    stage,
    { x: delta >= 0 ? 28 : -28, opacity: 0.25 },
    { x: 0, opacity: 1, duration: 0.38, ease: "power3.out", clearProps: "transform" }
  );
}
