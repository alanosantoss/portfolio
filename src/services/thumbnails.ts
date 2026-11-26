import type { ProjectItem } from "../types/project";
import { getYouTubeThumbCandidates } from "../utils/media";

export function attachThumbFallback(
  img: HTMLImageElement,
  card: HTMLElement | null,
  item: ProjectItem
): void {
  if (!img) return;

  if (item.type !== "video") {
    img.addEventListener("error", () => {
      card?.classList.add("has-media-error");
    });
    return;
  }

  const candidates = getYouTubeThumbCandidates(item.id || "");
  let step = 0;

  const advance = () => {
    if (step < candidates.length - 1) {
      step += 1;
      const nextUrl = candidates[step];
      if (nextUrl) img.src = nextUrl;
    } else {
      card?.classList.add("has-media-error");
    }
  };

  img.addEventListener("load", () => {
    if (img.naturalWidth > 0 && img.naturalWidth <= 120) {
      advance();
    }
  });
  img.addEventListener("error", advance);
}
