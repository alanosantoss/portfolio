/**
 * Centralização de strings de interface para suporte à internacionalização (i18n).
 * Padrão: Português do Brasil (pt-BR). Preparado para expansão futura (en).
 */
export type Locale = "pt-BR" | "en";

export interface TranslationDictionary {
  brand: string;
  role: string;
  tagline: string;
  nav: {
    home: string;
    video: string;
    design: string;
    ia: string;
    sobre: string;
    switchArea: string;
    quote: string;
  };
  pillars: {
    audiovisual: { title: string; desc: string };
    design: { title: string; desc: string };
    technology: { title: string; desc: string };
  };
  showreel: {
    title: string;
    desc: string;
  };
  caseStudy: {
    share: string;
    copied: string;
    requestQuote: string;
    challengeTitle: string;
    deliverablesTitle: string;
    toolsTitle: string;
    resultsTitle: string;
  };
}

export const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  "pt-BR": {
    brand: "Alan Oliveira",
    role: "Creative Designer & Video Editor",
    tagline: "Audiovisual, direção criativa e tecnologia aplicados à comunicação de marcas.",
    nav: {
      home: "home",
      video: "vídeo",
      design: "design",
      ia: "ia",
      sobre: "sobre",
      switchArea: "trocar área",
      quote: "Orçamento"
    },
    pillars: {
      audiovisual: {
        title: "Audiovisual",
        desc: "Edição de vídeo dinâmica, motion design, cortes rítmicos, color grading e sound design pensados para retenção."
      },
      design: {
        title: "Design & Direção",
        desc: "Identidade visual, key visuals, composição gráfica editorial e campanhas com estética moderna e consistente."
      },
      technology: {
        title: "Tecnologia Criativa",
        desc: "IA generativa para imagens e vídeos, automação de fluxos de trabalho e ferramentas digitais inovadoras."
      }
    },
    showreel: {
      title: "Showreel 2026",
      desc: "Uma seleção dos meus melhores trabalhos em edição, motion e direção criativa."
    },
    caseStudy: {
      share: "Copiar Link",
      copied: "Link copiado para a área de transferência!",
      requestQuote: "Solicitar Orçamento",
      challengeTitle: "Contexto & Desafio",
      deliverablesTitle: "Entregas & Serviços",
      toolsTitle: "Ferramentas",
      resultsTitle: "Resultados Verificados"
    }
  },
  en: {
    brand: "Alan Oliveira",
    role: "Creative Designer & Video Editor",
    tagline: "Audiovisual, creative direction, and technology applied to brand communication.",
    nav: {
      home: "home",
      video: "video",
      design: "design",
      ia: "ai",
      sobre: "about",
      switchArea: "switch area",
      quote: "Get a Quote"
    },
    pillars: {
      audiovisual: {
        title: "Audiovisual",
        desc: "Dynamic video editing, motion design, rhythmic cuts, color grading, and sound design engineered for retention."
      },
      design: {
        title: "Design & Direction",
        desc: "Visual identity, key visuals, editorial graphic composition, and cohesive advertising campaigns."
      },
      technology: {
        title: "Creative Technology",
        desc: "Generative AI for images and videos, workflow automation, and custom digital tools."
      }
    },
    showreel: {
      title: "Showreel 2026",
      desc: "A curated selection of my best work in video editing, motion design, and creative direction."
    },
    caseStudy: {
      share: "Copy Link",
      copied: "Direct project link copied to clipboard!",
      requestQuote: "Request a Quote",
      challengeTitle: "Context & Challenge",
      deliverablesTitle: "Deliverables & Services",
      toolsTitle: "Tools",
      resultsTitle: "Verified Outcomes"
    }
  }
};

let currentLocale: Locale = "pt-BR";

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function t(): TranslationDictionary {
  return TRANSLATIONS[currentLocale] || TRANSLATIONS["pt-BR"];
}
