/**
 * Gerenciador de preview leve de vídeo em hover/focus
 * Suporta MP4, WebM ou pequenos loops sem carregar iframes de YouTube pesados.
 */
let currentActiveVideo: HTMLVideoElement | null = null;

export function stopActiveVideoPreview(): void {
  if (currentActiveVideo) {
    try {
      currentActiveVideo.pause();
      currentActiveVideo.currentTime = 0;
    } catch {}
    currentActiveVideo = null;
  }
}

export function attachVideoPreview(card: HTMLElement, previewUrl: string): () => void {
  // Dispositivos exclusivamente touch não disparam preview de hover para economizar dados
  if (window.matchMedia("(hover: none)").matches) {
    return () => {};
  }

  let videoEl: HTMLVideoElement | null = null;
  let isHovered = false;

  const startPreview = () => {
    isHovered = true;
    if (!videoEl) {
      videoEl = document.createElement("video");
      videoEl.className = "card-preview-video";
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.preload = "none";
      videoEl.setAttribute("aria-hidden", "true");
      videoEl.src = previewUrl;
      card.appendChild(videoEl);
    }

    if (currentActiveVideo && currentActiveVideo !== videoEl) {
      stopActiveVideoPreview();
    }

    currentActiveVideo = videoEl;
    videoEl
      .play()
      .then(() => {
        if (!isHovered && videoEl) {
          videoEl.pause();
        } else {
          card.classList.add("has-video-playing");
        }
      })
      .catch(() => {
        // Fallback silencioso em navegadores com restrições
      });
  };

  const endPreview = () => {
    isHovered = false;
    card.classList.remove("has-video-playing");
    if (videoEl) {
      videoEl.pause();
      if (currentActiveVideo === videoEl) {
        currentActiveVideo = null;
      }
    }
  };

  card.addEventListener("mouseenter", startPreview);
  card.addEventListener("mouseleave", endPreview);
  card.addEventListener("focusin", startPreview);
  card.addEventListener("focusout", endPreview);

  return () => {
    card.removeEventListener("mouseenter", startPreview);
    card.removeEventListener("mouseleave", endPreview);
    card.removeEventListener("focusin", startPreview);
    card.removeEventListener("focusout", endPreview);
    if (videoEl && videoEl.parentNode) {
      videoEl.pause();
      videoEl.remove();
    }
  };
}
