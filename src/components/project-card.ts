import { attachThumbFallback } from "../services/thumbnails";
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
  card.className = `masonry-item ${item.ratio || "ratio-9-16"}`;
  card.style.animationDelay = `${index * 35}ms`;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${isVideo ? "Assistir" : "Ver"}: ${safeTitle}`);

  card.dataset.index = String(index);
  card.dataset.tags = (item.tags || []).join(" ");
  card.dataset.category = item.category || "";

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

  if (isVideo) {
    const playEl = document.createElement("div");
    playEl.className = "play-indicator";
    playEl.setAttribute("aria-hidden", "true");
    playEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <polygon points="7 5 19 12 7 19 7 5"></polygon>
      </svg>
    `;
    card.appendChild(playEl);
  }

  const overlay = document.createElement("div");
  overlay.className = "masonry-overlay";
  const titleSpan = document.createElement("span");
  titleSpan.className = "masonry-title";
  titleSpan.textContent = safeTitle;
  overlay.appendChild(titleSpan);
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
