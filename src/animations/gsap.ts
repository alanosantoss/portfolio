import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";

let registered = false;

export function ensureGsapPlugins(): void {
  if (registered) return;
  gsap.registerPlugin(Flip, CustomEase);
  if (typeof document !== "undefined") {
    document.documentElement?.classList.add("has-gsap-flip");
  }
  registered = true;
}

export { gsap, Flip, CustomEase };
