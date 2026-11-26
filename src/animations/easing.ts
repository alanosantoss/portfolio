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
  easesRegistered = true;
}
