import {
  animateLightboxClose,
  animateLightboxOpen,
  animateLightboxStep,
  cancelLightboxMotionRaf,
  clearLightboxStageMotion,
  killLightboxAnimations,
  type LightboxAnimationTargets
} from "../animations/lightbox-transition";
import { CATEGORY_LABELS } from "../core/config";
import type { ProjectItem } from "../types/project";
import { getYouTubeEmbedUrl } from "../utils/media";
import { escapeHtml, isSafeImageUrl } from "../utils/security";

export interface LightboxController {
  init: () => void;
  open: (index: number, originEl?: HTMLElement | null) => void;
  close: () => void;
  step: (delta: number) => void;
  isOpen: () => boolean;
}

export function createLightboxController(
  getItems: () => ProjectItem[],
  onIndexChange: (index: number) => void
): LightboxController {
  let currentIndex = -1;
  let isClosing = false;
  let lastFocusedElement: HTMLElement | null = null;
  let lastOriginEl: HTMLElement | null = null;
  let bound = false;

  const getTargets = (): LightboxAnimationTargets | null => {
    const lightbox = document.getElementById("lightbox");
    const content = document.getElementById("lightbox-content");
    if (!lightbox || !content) return null;
    return {
      lightbox,
      backdrop: document.getElementById("lightbox-backdrop"),
      stage: document.getElementById("lightbox-stage"),
      content,
      caption: document.getElementById("lightbox-caption")
    };
  };

  const clearFlipOrigin = (card: HTMLElement | null) => {
    if (!card) return;
    if (card.dataset) delete card.dataset.flipId;
    card.style.zIndex = "";
  };

  const renderContent = (originEl: HTMLElement | null) => {
    const items = getItems();
    if (currentIndex < 0 || currentIndex >= items.length) return;
    const item = items[currentIndex];
    const targets = getTargets();
    if (!item || !targets) return;

    const isVideo = item.type === "video";
    const isVertical = item.aspect === "9:16" || item.ratio === "ratio-9-16";
    const safeTitleAttr = escapeHtml(item.title || "");

    if (isVideo) {
      targets.stage?.classList.toggle("is-vertical", isVertical);
      targets.content.className = `lightbox-video-wrap ${isVertical ? "is-vertical" : ""}`;
      const encodedId = encodeURIComponent(item.id || "");
      const originImg =
        typeof originEl?.querySelector === "function" ? originEl.querySelector("img") : null;
      const originThumb = originImg?.currentSrc || originImg?.src || "";
      const posterUrl = isSafeImageUrl(originThumb)
        ? escapeHtml(originThumb)
        : `https://i.ytimg.com/vi/${encodedId}/hqdefault.jpg`;
      const embedUrl = getYouTubeEmbedUrl(item.id || "");

      targets.content.innerHTML = `
        <img class="lightbox-poster" src="${posterUrl}" alt="" aria-hidden="true" />
        <iframe
          src="${embedUrl}"
          title="${safeTitleAttr}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      `;

      const ytIframe = targets.content.querySelector("iframe");
      const markReady = () => ytIframe?.classList.add("is-ready");
      const readyFallbackTimer = setTimeout(markReady, 900);
      ytIframe?.addEventListener("load", () => {
        clearTimeout(readyFallbackTimer);
        markReady();
        // shortcut: YouTube ignora vq/setPlaybackQuality em alguns embeds (ABR proprio)
        try {
          ytIframe.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["highres"] }),
            "https://www.youtube-nocookie.com"
          );
          ytIframe.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
            "https://www.youtube-nocookie.com"
          );
        } catch {}
      });
    } else {
      targets.stage?.classList.remove("is-vertical");
      targets.content.className = "lightbox-image-wrap";
      if (isSafeImageUrl(item.image)) {
        targets.content.innerHTML = `
          <img class="lightbox-image" src="${escapeHtml(item.image)}" alt="${safeTitleAttr}" />
        `;
      } else {
        targets.content.innerHTML = "";
      }
    }

    if (targets.caption) {
      const catLabel = CATEGORY_LABELS[item.category] || item.category || "";
      targets.caption.textContent = catLabel ? `${item.title || ""} • ${catLabel}` : item.title || "";
    }
  };

  const open = (index: number, originEl?: HTMLElement | null) => {
    const targets = getTargets();
    if (!targets || isClosing) return;

    killLightboxAnimations(targets, lastOriginEl);
    cancelLightboxMotionRaf();
    clearFlipOrigin(lastOriginEl);

    lastFocusedElement = document.activeElement as HTMLElement | null;
    lastOriginEl = originEl || lastFocusedElement;
    currentIndex = index;
    onIndexChange(index);

    renderContent(lastOriginEl);
    targets.content.style.visibility = "";
    targets.lightbox.classList.remove("is-closing");
    targets.lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";

    animateLightboxOpen(targets, lastOriginEl);

    const closeBtn = document.getElementById("lightbox-close");
    if (closeBtn && typeof closeBtn.focus === "function") {
      closeBtn.focus();
    }
  };

  const close = () => {
    const targets = getTargets();
    if (!targets || isClosing || !targets.lightbox.classList.contains("is-open")) return;

    isClosing = true;
    killLightboxAnimations(targets, lastOriginEl);
    cancelLightboxMotionRaf();

    const finishClose = () => {
      cancelLightboxMotionRaf();
      targets.lightbox.classList.remove("is-open", "is-closing");
      targets.lightbox.style.opacity = "";
      if (targets.backdrop) targets.backdrop.style.opacity = "";
      targets.content.style.visibility = "";
      targets.content.style.transform = "";
      if (targets.content.dataset) delete targets.content.dataset.flipId;
      targets.content.innerHTML = "";
      if (targets.caption) {
        targets.caption.textContent = "";
        targets.caption.style.opacity = "";
        targets.caption.style.transform = "";
      }
      if (targets.stage) {
        targets.stage.classList.remove("is-vertical");
        clearLightboxStageMotion(targets.stage);
      }
      clearFlipOrigin(lastOriginEl);
      document.body.style.overflow = "";
      currentIndex = -1;
      onIndexChange(-1);
      isClosing = false;
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
      lastFocusedElement = null;
      lastOriginEl = null;
    };

    targets.lightbox.classList.add("is-closing");
    animateLightboxClose(targets, lastOriginEl, finishClose);
  };

  const step = (delta: number) => {
    const items = getItems();
    const total = items.length;
    if (!total) return;

    currentIndex = (currentIndex + delta + total) % total;
    onIndexChange(currentIndex);

    clearFlipOrigin(lastOriginEl);
    const galleryGrid = document.getElementById("gallery-grid");
    const nextCard = galleryGrid?.querySelector<HTMLElement>(
      `.masonry-item[data-index="${currentIndex}"]`
    );
    if (nextCard) {
      lastOriginEl = nextCard;
    }

    renderContent(lastOriginEl);
    const targets = getTargets();
    animateLightboxStep(targets?.stage ?? null, delta);
  };

  const isOpen = (): boolean => {
    return Boolean(document.getElementById("lightbox")?.classList.contains("is-open"));
  };

  const init = () => {
    if (bound) return;
    bound = true;

    const targets = getTargets();
    if (!targets) return;

    document.getElementById("lightbox-close")?.addEventListener("click", close);
    document.getElementById("lightbox-prev")?.addEventListener("click", () => step(-1));
    document.getElementById("lightbox-next")?.addEventListener("click", () => step(1));

    targets.lightbox.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target === targets.lightbox || target?.id === "lightbox-backdrop") {
        close();
      }
    });
  };

  return { init, open, close, step, isOpen };
}
