import type { MainCategory, ProjectCategory, ProjectItem } from "./project";

export const INTRO_STATES = {
  INITIALIZING: "INITIALIZING",
  PRELOADING: "PRELOADING",
  INTRO_RUNNING: "INTRO_RUNNING",
  MORPHING_TO_GATE: "MORPHING_TO_GATE",
  GATE_READY: "GATE_READY",
  AREA_TRANSITION: "AREA_TRANSITION",
  PORTFOLIO_READY: "PORTFOLIO_READY",
  FALLBACK: "FALLBACK"
} as const;

export type IntroState = (typeof INTRO_STATES)[keyof typeof INTRO_STATES];

export interface AppState {
  activeCategory: MainCategory;
  activeSubFilter: string;
  lockedCategory: ProjectCategory | null;
  currentItems: ProjectItem[];
  lightboxIndex: number;
  introState: IntroState;
  isInteractionsLocked: boolean;
}

export type QuoteField = "service" | "format" | "volume" | "deadline" | "notes";

export interface QuoteState {
  service: string;
  format: string[];
  volume: string;
  deadline: string;
  notes: string;
}
