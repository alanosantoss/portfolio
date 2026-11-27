import {
  animateLightboxClose,
  animateLightboxOpen,
  animateLightboxStep,
  cancelLightboxMotionRaf,
  clearLightboxStageMotion,
  completeLightboxHandoff,
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
  let isOpening = false;
  let lastFocusedElement: HTMLElement | null = null;
  let lastOriginEl: HTMLElement | null = null;
  let bound = false;
  let playerReady = false;
  let motionFinished = false;
  let ytMessageListener: ((e: MessageEvent) => void) | null = null;

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

  const getPosterUrl = (item: ProjectItem, originEl: HTMLElement | null): string => {
    const originImg = typeof originEl?.querySelector === "function" ? originEl.querySelector("img") : null;
    const originThumb = originImg?.currentSrc || originImg?.src || "";
    if (isSafeImageUrl(originThumb)) return originThumb;
    if (item.type === "video") {
      return `https://i.ytimg.com/vi/${encodeURIComponent(item.id || "")}/hqdefault.jpg`;
    }
    return item.image || "";
  };

  const clearFlipOrigin = (card: HTMLElement | null) => {
    if (!card) return;
    card.style.opacity = "1";
    if (card.dataset) delete card.dataset.flipId;
    card.style.zIndex = "";
  };

  const checkAndExecuteHandoff = (targets: LightboxAnimationTargets) => {
    if (motionFinished && playerReady) {
      completeLightboxHandoff(targets);
    }
  };

  const renderContent = (_originEl: HTMLElement | null, posterUrl: string) => {
    const items = getItems();
    if (currentIndex < 0 || currentIndex >= items.length) return;
    const item = items[currentIndex];
    const targets = getTargets();
    if (!item || !targets) return;

    // Remove qualquer listener anterior do YouTube
    if (ytMessageListener) {
      window.removeEventListener("message", ytMessageListener);
      ytMessageListener = null;
    }

    const isVideo = item.type === "video";
    const isVertical = item.aspect === "9:16" || item.ratio === "ratio-9-16";
    const safeTitleAttr = escapeHtml(item.title || "");
    playerReady = false;

    if (isVideo) {
      targets.stage?.classList.toggle("is-vertical", isVertical);
      targets.content.className = `lightbox-video-wrap ${isVertical ? "is-vertical" : ""}`;
      const embedUrl = getYouTubeEmbedUrl(item.id || "");

      targets.content.innerHTML = `
        <img class="lightbox-poster" src="${escapeHtml(posterUrl)}" alt="" aria-hidden="true" />
        <iframe
          src="${embedUrl}"
          title="${safeTitleAttr}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      `;

      const ytIframe = targets.content.querySelector("iframe");

      const markPlayerReady = () => {
        if (playerReady) return;
        playerReady = true;
        ytIframe?.classList.add("is-ready");
        checkAndExecuteHandoff(targets);
      };

      // 1. YouTube postMessage API listener para onReady ou stateChange
      ytMessageListener = (event: MessageEvent) => {
        if (!event.origin.includes("youtube") && !event.origin.includes("youtube-nocookie")) return;
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data?.event === "onReady" || data?.event === "initialDelivery" || data?.info?.playerState !== undefined) {
            markPlayerReady();
          }
        } catch {}
      };
      window.addEventListener("message", ytMessageListener);

      // 2. Iframe load event como fallback secundário
      ytIframe?.addEventListener("load", () => {
        try {
          ytIframe.contentWindow?.postMessage(
            JSON.stringify({ event: "listening" }),
            "*"
          );
        } catch {}
        // Fallback imediato se o player load completar
        setTimeout(markPlayerReady, 120);
      });

      // 3. Bounded safety timeout (nunca deixar retângulo preto indefinido)
      setTimeout(markPlayerReady, 1200);
    } else {
      targets.stage?.classList.remove("is-vertical");
      targets.content.className = "lightbox-image-wrap";
      if (isSafeImageUrl(item.image)) {
        targets.content.innerHTML = `
          <img class="lightbox-image" src="${escapeHtml(item.image)}" alt="${safeTitleAttr}" />
        `;
        const imgEl = targets.content.querySelector("img");
        if (imgEl?.complete) {
          playerReady = true;
        } else {
          imgEl?.addEventListener("load", () => {
            playerReady = true;
            checkAndExecuteHandoff(targets);
          });
          setTimeout(() => {
            playerReady = true;
            checkAndExecuteHandoff(targets);
          }, 300);
        }
      } else {
        targets.content.innerHTML = "";
        playerReady = true;
      }
    }

    if (targets.caption) {
      const catLabel = CATEGORY_LABELS[item.category] || item.category || "";
      targets.caption.textContent = catLabel ? `${item.title || ""} • ${catLabel}` : item.title || "";
    }
  };

  const open = (index: number, originEl?: HTMLElement | null) => {
    const targets = getTargets();
    if (!targets || isClosing || isOpening) return;

    isOpening = true;
    killLightboxAnimations(targets, lastOriginEl);
    cancelLightboxMotionRaf();
    clearFlipOrigin(lastOriginEl);

    lastFocusedElement = document.activeElement as HTMLElement | null;
    lastOriginEl = originEl || lastFocusedElement;
    currentIndex = index;
    onIndexChange(index);

    const items = getItems();
    const item = items[index];
    const posterUrl = item ? getPosterUrl(item, lastOriginEl) : "";

    renderContent(lastOriginEl, posterUrl);
    targets.content.style.visibility = "";
    targets.lightbox.classList.remove("is-closing");
    targets.lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";

    motionFinished = false;
    animateLightboxOpen(targets, lastOriginEl, {
      posterUrl,
      onReadyToCrossfade: () => {
        motionFinished = true;
        checkAndExecuteHandoff(targets);
      },
      onComplete: () => {
        isOpening = false;
      }
    });

    const closeBtn = document.getElementById("lightbox-close");
    if (closeBtn && typeof closeBtn.focus === "function") {
      closeBtn.focus();
    }
  };

  const close = () => {
    const targets = getTargets();
    if (!targets || isClosing || !targets.lightbox.classList.contains("is-open")) return;

    isClosing = true;
    isOpening = false;

    // 1. Para imediatamente o vídeo e o áudio enviando pause/stop e limpando o iframe
    const ytIframe = targets.content.querySelector("iframe");
    if (ytIframe) {
      try {
        ytIframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
        ytIframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "stopVideo", args: [] }),
          "*"
        );
      } catch {}
      // Remove src do iframe para corte estrito e garantido de conexões de áudio
      ytIframe.src = "about:blank";
    }

    if (ytMessageListener) {
      window.removeEventListener("message", ytMessageListener);
      ytMessageListener = null;
    }

    killLightboxAnimations(targets, lastOriginEl);
    cancelLightboxMotionRaf();

    const items = getItems();
    const item = items[currentIndex];
    const posterUrl = item ? getPosterUrl(item, lastOriginEl) : "";

    const finishClose = () => {
      cancelLightboxMotionRaf();
      targets.lightbox.classList.remove("is-open", "is-closing", "controls-visible");
      targets.lightbox.style.opacity = "";
      if (targets.backdrop) targets.backdrop.style.opacity = "";
      targets.content.style.visibility = "";
      targets.content.style.opacity = "";
      targets.content.style.transform = "";
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
    animateLightboxClose(targets, lastOriginEl, finishClose, { posterUrl });
  };

  const step = (delta: number) => {
    if (isClosing) return;
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

    const item = items[currentIndex];
    const posterUrl = item ? getPosterUrl(item, lastOriginEl) : "";
    renderContent(lastOriginEl, posterUrl);
    const targets = getTargets();
    if (targets) {
      motionFinished = true;
      playerReady = true;
      targets.content.style.opacity = "1";
    }
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
