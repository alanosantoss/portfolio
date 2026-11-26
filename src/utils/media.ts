import type { AspectRatio, ProjectItem, RatioClass } from "../types/project";

export const ASPECT_TO_RATIO: Record<AspectRatio, RatioClass> = {
  "9:16": "ratio-9-16",
  "16:9": "ratio-16-9",
  "4:3": "ratio-4-3",
  "3:2": "ratio-3-2"
};

export const RATIO_TO_ASPECT: Record<RatioClass, AspectRatio> = {
  "ratio-9-16": "9:16",
  "ratio-16-9": "16:9",
  "ratio-4-3": "4:3",
  "ratio-3-2": "3:2"
};

const RATIO_WEIGHTS: Record<RatioClass, number> = {
  "ratio-9-16": 16 / 9,
  "ratio-16-9": 9 / 16,
  "ratio-4-3": 3 / 4,
  "ratio-3-2": 2 / 3
};

export function getItemAspect(item?: Partial<ProjectItem> | null): AspectRatio {
  if (item?.aspect && item.aspect in ASPECT_TO_RATIO) {
    return item.aspect;
  }
  if (item?.ratio && item.ratio in RATIO_TO_ASPECT) {
    return RATIO_TO_ASPECT[item.ratio];
  }
  return "9:16";
}

export function getRatioWeight(item?: Partial<ProjectItem> | null): number {
  if (item?.ratio && item.ratio in RATIO_WEIGHTS) {
    return RATIO_WEIGHTS[item.ratio];
  }
  return item?.aspect === "16:9" ? 9 / 16 : 16 / 9;
}

export function getColumnCount(width: number = window.innerWidth): number {
  if (width <= 768) return 2;
  if (width <= 900) return 3;
  return 4;
}

export function getYouTubeThumbCandidates(id: string): [string, string, string] {
  const encodedId = encodeURIComponent(id || "");
  return [
    `https://i.ytimg.com/vi/${encodedId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${encodedId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${encodedId}/hqdefault.jpg`
  ];
}

export function getYouTubeEmbedUrl(id: string): string {
  const encodedId = encodeURIComponent(id || "");
  return `https://www.youtube-nocookie.com/embed/${encodedId}?autoplay=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&playsinline=1&disablekb=1&vq=highres&enablejsapi=1`;
}

export function prefersReducedMotion(): boolean {
  return Boolean(
    typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
