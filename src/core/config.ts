import type { MainCategory, ProjectCategory, SubcategoryOption } from "../types/project";

export const CONFIG = {
  WHATSAPP_NUMBER: "5511991584991",
  WHATSAPP_MESSAGE: "Olá Alan, vi seu portfólio e gostaria de conversar sobre um projeto.",
  EMAIL: "alan.d.santos2021@gmail.com",
  LINKEDIN_URL: "https://www.linkedin.com/in/alan-oliveira-765286274/"
} as const;

export const VALID_CATEGORIES: readonly MainCategory[] = [
  "home",
  "video",
  "design",
  "ia",
  "sobre"
];

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  video: "vídeo",
  design: "design",
  ia: "ia"
};

export const SUBCATEGORIES: Record<ProjectCategory, readonly SubcategoryOption[]> = {
  video: [
    { id: "comercial", label: "comercial" },
    { id: "fitness", label: "fitness" },
    { id: "saude", label: "saúde" },
    { id: "institucional", label: "institucional" },
    { id: "imobiliario", label: "imobiliário" },
    { id: "ugc", label: "ugc" },
    { id: "viral", label: "viral" },
    { id: "16:9", label: "16:9" }
  ],
  design: [
    { id: "comercial", label: "comercial" },
    { id: "identidade", label: "identidade visual" },
    { id: "editorial", label: "editorial" }
  ],
  ia: [
    { id: "video-ia", label: "vídeo ia" },
    { id: "renders", label: "renders" }
  ]
};

export const INTRO_CONFIG = {
  frameCount: 8,
  preloadTimeoutMs: 450,
  fontTimeoutMs: 250,
  lineWidth: 120,
  phases: {
    lineStart: 0,
    lineDuration: 0.3,
    revealStart: 0.3,
    revealDuration: 0.35,
    reelStart: 0.65,
    reelDuration: 0.95,
    brandStart: 1.6,
    brandDuration: 0.35,
    morphStart: 1.95,
    morphDuration: 0.7,
    backdropStart: 2.1,
    backdropDuration: 0.55,
    contentStart: 2.55,
    contentStagger: 0.05,
    contentDuration: 0.4,
    exitDuration: 0.62
  },
  eases: {
    morph: "M0,0 C0.76,0 0.24,1 1,1",
    reveal: "M0,0 C0.16,1 0.3,1 1,1",
    reel: "M0,0 C0.33,1 0.68,1 1,1",
    exit: "M0,0 C0.65,0 0.35,1 1,1"
  }
} as const;
