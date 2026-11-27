import { INTRO_CONFIG } from "../core/config";
import { CustomEase, ensureGsapPlugins } from "./gsap";

let easesRegistered = false;

export function registerIntroEases(): void {
  ensureGsapPlugins();
  if (easesRegistered) return;
  CustomEase.create("introMorph", INTRO_CONFIG.eases.morph);
  CustomEase.create("introReveal", INTRO_CONFIG.eases.reveal);
  CustomEase.create("introReel", INTRO_CONFIG.eases.reel);
  CustomEase.create("introExit", INTRO_CONFIG.eases.exit);
  CustomEase.create("lightboxGeometry", "0.76, 0, 0.24, 1");
  CustomEase.create("lightboxOpacity", "0.16, 1, 0.3, 1");
  easesRegistered = true;
}

