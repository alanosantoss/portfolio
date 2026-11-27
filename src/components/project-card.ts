import { attachThumbFallback } from "../services/thumbnails";
import { attachVideoPreview } from "../services/video-preview";
import type { ProjectItem } from "../types/project";
import { isSafeImageUrl } from "../utils/security";

export function createProjectCard(
  item: ProjectItem,
  index: number,
  onOpen: (index: number, card: HTMLElement) => void
): HTMLElement {
  const isVideo = item.type === "video";
  const safeTitle = String(item.title || "");
  const card = document.createElement("article");
  card.className = `masonry-item ${item.ratio || "ratio-9-16"}${item.caseStudy ? " has-case-study" : ""}`;
  card.style.animationDelay = `${index * 35}ms`;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${isVideo ? "Assistir" : "Ver"}: ${safeTitle}`);

  card.dataset.index = String(index);
  card.dataset.tags = (item.tags || []).join(" ");
  card.dataset.category = item.category || "";
  if (item.slug) card.dataset.slug = item.slug;

  const img = document.createElement("img");
  img.className = "masonry-media";
  img.alt = safeTitle;
  img.setAttribute("loading", "lazy");

  const thumbUrl = isVideo
    ? `https://i.ytimg.com/vi/${encodeURIComponent(item.id || "")}/maxresdefault.jpg`
    : item.image || "";

  if (isVideo || isSafeImageUrl(thumbUrl)) {
    img.src = thumbUrl;
  } else {
    card.classList.add("has-media-error");
  }

  attachThumbFallback(img, card, item);
  card.appendChild(img);

  // Vídeo preview opcional se configurado
  if (item.previewUrl) {
    attachVideoPreview(card, item.previewUrl);
  }

  if (isVideo) {
    const playEl = document.createElement("div");
    playEl.className = "play-indicator";
    playEl.setAttribute("aria-hidden", "true");
    playEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <polygon points="8 5 19 12 8 19 8 5"></polygon>
      </svg>
    `;
    card.appendChild(playEl);
  } else {
    const viewEl = document.createElement("div");
    viewEl.className = "play-indicator view-indicator";
    viewEl.setAttribute("aria-hidden", "true");
    viewEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
      </svg>
    `;
    card.appendChild(viewEl);
  }

  // Overlay contextual moderno e sutil (revelado em hover/focus e adaptado a touch)
  const overlay = document.createElement("div");
  overlay.className = "masonry-overlay";

  const metaContent = document.createElement("div");
  metaContent.className = "masonry-meta-content";

  const titleSpan = document.createElement("span");
  titleSpan.className = "masonry-title";
  titleSpan.textContent = safeTitle;
  metaContent.appendChild(titleSpan);

  const subLine = document.createElement("div");
  subLine.className = "masonry-subline";

  // Linha decorativa champagne de aproximadamente 24px
  const decorLine = document.createElement("span");
  decorLine.className = "masonry-decor-line";
  subLine.appendChild(decorLine);

  // Subcategoria formatada em maiúsculas (ex: FITNESS, COMERCIAL, ETC)
  const subCategoryText =
    (item.tags && item.tags.length > 0 && item.tags[0]) ||
    item.category ||
    "PROJETO";

  const catBadge = document.createElement("span");
  catBadge.className = "masonry-badge";
  catBadge.textContent = subCategoryText.toUpperCase();
  subLine.appendChild(catBadge);

  metaContent.appendChild(subLine);
  overlay.appendChild(metaContent);

  const openIndicator = document.createElement("span");
  openIndicator.className = "masonry-open-indicator";
  openIndicator.setAttribute("aria-hidden", "true");
  openIndicator.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
      <path d="M7 17L17 7M17 7H7M17 7V17"></path>
    </svg>
  `;
  overlay.appendChild(openIndicator);

  card.appendChild(overlay);

  const handleCardAction = () => onOpen(index, card);

  card.addEventListener("click", handleCardAction);
  card.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardAction();
    }
  });

  return card;
}
