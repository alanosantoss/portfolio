import { INTRO_CONFIG } from "../core/config";
import { prefersReducedMotion } from "../utils/media";
import { registerIntroEases } from "./easing";
import { CustomEase, gsap } from "./gsap";

export interface GateTransitionElements {
  gate: HTMLElement;
  card: HTMLElement | null;
  contentItems: HTMLElement[];
}

export function clearGateMotionProps(elements: GateTransitionElements): void {
  const targets = [elements.gate, elements.card, ...elements.contentItems].filter(
    (el): el is HTMLElement => Boolean(el)
  );
  if (targets.length > 0) {
    gsap.set(targets, { clearProps: "all" });
  }
}

export function animateGateExit(
  elements: GateTransitionElements,
  onComplete: () => void
): gsap.core.Timeline | null {
  if (prefersReducedMotion() || !elements.card) {
    onComplete();
    return null;
  }

  registerIntroEases();
  const exitEase = CustomEase.get("introExit") ? "introExit" : "power2.inOut";

  const tl = gsap.timeline({ onComplete });
  tl.to(elements.contentItems, { opacity: 0, duration: 0.22, ease: exitEase }, 0)
    .to(elements.card, { opacity: 0, scale: 0.97, duration: 0.42, ease: exitEase }, 0.08)
    .to(
      elements.gate,
      {
        opacity: 0,
        backdropFilter: "blur(0px)",
        duration: INTRO_CONFIG.phases.exitDuration,
        ease: exitEase
      },
      0.05
    );

  return tl;
}
