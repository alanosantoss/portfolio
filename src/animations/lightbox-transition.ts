import { registerIntroEases } from "./easing";
import { CustomEase, ensureGsapPlugins, gsap } from "./gsap";
import { hasValidRect } from "../utils/dom";
import { prefersReducedMotion } from "../utils/media";

export interface LightboxAnimationTargets {
  lightbox: HTMLElement;
  backdrop: HTMLElement | null;
  stage: HTMLElement | null;
  content: HTMLElement;
  caption: HTMLElement | null;
}

let activeTransitionSurface: HTMLElement | null = null;
let activeMasterTimeline: gsap.core.Timeline | null = null;

export function killLightboxAnimations(
  targets: Partial<LightboxAnimationTargets>,
  originEl?: HTMLElement | null
): void {
  if (activeMasterTimeline) {
    activeMasterTimeline.kill();
    activeMasterTimeline = null;
  }

  if (activeTransitionSurface) {
    activeTransitionSurface.remove();
    activeTransitionSurface = null;
  }

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

export function cancelLightboxMotionRaf(): void {
  // Mantido para compatibilidade com a interface existente
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
  originEl: HTMLElement | null,
  options?: {
    posterUrl?: string;
    onReadyToCrossfade?: () => void;
    onComplete?: () => void;
  }
): void {
  ensureGsapPlugins();
  registerIntroEases();

  const geomEase = CustomEase.get("lightboxGeometry") ? "lightboxGeometry" : "power3.inOut";
  const opacEase = CustomEase.get("lightboxOpacity") ? "lightboxOpacity" : "power2.out";

  const backdropEl = targets.backdrop || targets.lightbox;
  targets.lightbox.classList.remove("controls-visible");

  // Se reduzido motion ou sem card de origem válido
  if (prefersReducedMotion() || !hasValidRect(originEl) || !hasValidRect(targets.content)) {
    if (originEl) originEl.style.opacity = "1";
    targets.content.style.opacity = "1";
    targets.lightbox.classList.add("controls-visible");
    gsap.set(backdropEl, { opacity: 1 });
    if (targets.caption) gsap.set(targets.caption, { opacity: 1, y: 0 });
    options?.onReadyToCrossfade?.();
    options?.onComplete?.();
    return;
  }

  const cardRect = originEl.getBoundingClientRect();
  const destRect = targets.content.getBoundingClientRect();

  // Captura propriedades do card de origem
  const cardComputed = window.getComputedStyle(originEl);
  const initialRadius = parseFloat(cardComputed.borderRadius) || 4;

  const destComputed = window.getComputedStyle(targets.content);
  const destRadius = parseFloat(destComputed.borderRadius) || 8;

  // Cria a superfície visual temporária independente
  const surface = document.createElement("div");
  surface.id = "lightbox-shared-surface";
  Object.assign(surface.style, {
    position: "fixed",
    left: `${cardRect.left}px`,
    top: `${cardRect.top}px`,
    width: `${cardRect.width}px`,
    height: `${cardRect.height}px`,
    borderRadius: `${initialRadius}px`,
    overflow: "hidden",
    zIndex: "9998",
    pointerEvents: "none",
    boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
    backgroundColor: "#111111",
    willChange: "left, top, width, height, border-radius, box-shadow"
  });

  const img = document.createElement("img");
  img.src = options?.posterUrl || "";
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  Object.assign(img.style, {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block"
  });
  surface.appendChild(img);

  document.body.appendChild(surface);
  activeTransitionSurface = surface;

  // Preserva espaço do card original no masonry grid tornando-o invisível temporariamente
  originEl.style.opacity = "0";

  // O container do lightbox fica invisível enquanto a superfície viaja
  targets.content.style.opacity = "0";

  // Timeline com duração exata de ~450ms
  const tl = gsap.timeline({
    onComplete: () => {
      activeMasterTimeline = null;
      // Notifica para crossfade e remoção da superfície temporária
      options?.onReadyToCrossfade?.();
      options?.onComplete?.();
    }
  });
  activeMasterTimeline = tl;

  // 1. Escurecimento e desfoque progressivo do backdrop
  tl.fromTo(
    backdropEl,
    { opacity: 0 },
    { opacity: 1, duration: 0.45, ease: opacEase },
    0
  );

  // 2. Interpolação geométrica da superfície visual
  tl.to(
    surface,
    {
      left: destRect.left,
      top: destRect.top,
      width: destRect.width,
      height: destRect.height,
      borderRadius: destRadius,
      boxShadow: "0 28px 70px rgba(0, 0, 0, 0.75)",
      duration: 0.45,
      ease: geomEase
    },
    0
  );

  // 3. Revela legenda e controles ao final da transição (~0.32s)
  if (targets.caption) {
    tl.fromTo(
      targets.caption,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.28, ease: opacEase },
      0.3
    );
  }

  tl.add(() => {
    targets.lightbox.classList.add("controls-visible");
  }, 0.35);
}

export function completeLightboxHandoff(
  targets: LightboxAnimationTargets
): void {
  // Mostra o conteúdo real (iframe ou imagem)
  targets.content.style.opacity = "1";

  // Faz o crossfade suave e remove a superfície temporária se existir
  if (activeTransitionSurface) {
    const s = activeTransitionSurface;
    activeTransitionSurface = null;
    gsap.to(s, {
      opacity: 0,
      duration: 0.18,
      ease: "power2.out",
      onComplete: () => s.remove()
    });
  }
}

export function animateLightboxClose(
  targets: LightboxAnimationTargets,
  originEl: HTMLElement | null,
  onComplete: () => void,
  options?: {
    posterUrl?: string;
  }
): void {
  ensureGsapPlugins();
  registerIntroEases();

  const geomEase = CustomEase.get("lightboxGeometry") ? "lightboxGeometry" : "power3.inOut";
  const opacEase = CustomEase.get("lightboxOpacity") ? "lightboxOpacity" : "power2.in";

  const backdropEl = targets.backdrop || targets.lightbox;
  targets.lightbox.classList.remove("controls-visible");

  // Limpa qualquer superfície anterior
  if (activeTransitionSurface) {
    activeTransitionSurface.remove();
    activeTransitionSurface = null;
  }

  // Se o card de origem não for mais visível ou não tiver geometria válida
  const isOriginVisible = hasValidRect(originEl) && (originEl?.getBoundingClientRect().bottom ?? 0) > 0 &&
    (originEl?.getBoundingClientRect().top ?? 0) < window.innerHeight;

  if (prefersReducedMotion() || !isOriginVisible || !originEl || !hasValidRect(targets.content)) {
    if (originEl) originEl.style.opacity = "1";
    gsap.to(backdropEl, {
      opacity: 0,
      duration: 0.25,
      ease: opacEase,
      onComplete
    });
    return;
  }

  const originRect = originEl.getBoundingClientRect();
  const currentMediaRect = targets.content.getBoundingClientRect();

  const originComputed = window.getComputedStyle(originEl);
  const targetRadius = parseFloat(originComputed.borderRadius) || 4;

  const currentComputed = window.getComputedStyle(targets.content);
  const initialRadius = parseFloat(currentComputed.borderRadius) || 8;

  // Cria a superfície de retorno sobre a posição do player
  const surface = document.createElement("div");
  surface.id = "lightbox-shared-surface-close";
  Object.assign(surface.style, {
    position: "fixed",
    left: `${currentMediaRect.left}px`,
    top: `${currentMediaRect.top}px`,
    width: `${currentMediaRect.width}px`,
    height: `${currentMediaRect.height}px`,
    borderRadius: `${initialRadius}px`,
    overflow: "hidden",
    zIndex: "9998",
    pointerEvents: "none",
    boxShadow: "0 28px 70px rgba(0, 0, 0, 0.75)",
    backgroundColor: "#111111",
    willChange: "left, top, width, height, border-radius, box-shadow"
  });

  const img = document.createElement("img");
  img.src = options?.posterUrl || "";
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  Object.assign(img.style, {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block"
  });
  surface.appendChild(img);

  document.body.appendChild(surface);
  activeTransitionSurface = surface;

  // Oculta o conteúdo interno do lightbox (player/iframe)
  targets.content.style.opacity = "0";

  // Timeline de fechamento com duração de ~350ms
  const tl = gsap.timeline({
    onComplete: () => {
      activeMasterTimeline = null;
      if (activeTransitionSurface) {
        activeTransitionSurface.remove();
        activeTransitionSurface = null;
      }
      // Restaura visibilidade do card original
      originEl.style.opacity = "1";
      onComplete();
    }
  });
  activeMasterTimeline = tl;

  // Fade out do caption e controles imediatamente
  if (targets.caption) {
    tl.to(targets.caption, { opacity: 0, y: 8, duration: 0.16, ease: opacEase }, 0);
  }

  // Interpolação geométrica de volta ao card
  tl.to(
    surface,
    {
      left: originRect.left,
      top: originRect.top,
      width: originRect.width,
      height: originRect.height,
      borderRadius: targetRadius,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      duration: 0.35,
      ease: geomEase
    },
    0
  );

  // Fade out progressivo do backdrop
  tl.to(
    backdropEl,
    { opacity: 0, duration: 0.35, ease: opacEase },
    0
  );
}

export function animateLightboxStep(stage: HTMLElement | null, delta: number): void {
  if (!stage || prefersReducedMotion()) return;
  ensureGsapPlugins();
  gsap.fromTo(
    stage,
    { x: delta >= 0 ? 28 : -28, opacity: 0.25 },
    { x: 0, opacity: 1, duration: 0.32, ease: "power3.out", clearProps: "transform" }
  );
}
