/**
 * Componente de Hero Editorial em Duas Colunas
 * 1. Coluna Esquerda: Eyebrow (categoria), Headline impactante (Plus Jakarta Sans), Descrição concisa (Inter)
 * 2. Coluna Direita: Showreel / Mídia em destaque com poster vertical (9:16) ou widescreen dependendo da categoria,
 *    play indicator minimalista e cantos arredondados (12px).
 */
import type { MainCategory } from "../types/project";
import { escapeHtml } from "../utils/security";

export interface EditorialHeroConfig {
  eyebrow: string;
  headline: string;
  description: string;
  showreelTitle: string;
  showreelDuration?: string;
  posterUrl: string;
}

const DEFAULT_HERO_CONFIG: EditorialHeroConfig = {
  eyebrow: "DIREÇÃO CRIATIVA & EDIÇÃO DE VÍDEO",
  headline: "Ideias em movimento.",
  description: "Edição de vídeo, motion design e narrativa audiovisual.",
  showreelTitle: "Showreel 2026",
  showreelDuration: "0:45",
  posterUrl: "https://i.ytimg.com/vi/aNsA0iwBbqc/hqdefault.jpg"
};

export const CATEGORY_HERO_CONFIG: Record<string, EditorialHeroConfig> = {
  video: DEFAULT_HERO_CONFIG,
  design: {
    eyebrow: "DIREÇÃO DE ARTE & IDENTIDADE VISUAL",
    headline: "Forma, impacto e precisão.",
    description: "Design editorial, key visuals e composição gráfica para marcas.",
    showreelTitle: "Destaque Visual",
    posterUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=85"
  },
  ia: {
    eyebrow: "TECNOLOGIA CRIATIVA & IA GENERATIVA",
    headline: "Avanço técnico e estética.",
    description: "Síntese visual com IA, render conceitual e ferramentas inteligentes.",
    showreelTitle: "Destaque Criativo",
    posterUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=85"
  },
  home: DEFAULT_HERO_CONFIG
};

export interface EditorialHeroOptions {
  category: MainCategory;
  onPlayShowreel?: () => void;
}

export function createEditorialHeroComponent(options: EditorialHeroOptions): HTMLElement {
  const catKey = options.category in CATEGORY_HERO_CONFIG ? options.category : "home";
  const config = CATEGORY_HERO_CONFIG[catKey] ?? DEFAULT_HERO_CONFIG;

  const section = document.createElement("section");
  section.className = "editorial-hero-section";
  section.setAttribute("aria-label", "Destaque Editorial");

  const durationHtml = config.showreelDuration
    ? `<span class="editorial-duration">${escapeHtml(config.showreelDuration)}</span>`
    : "";

  section.innerHTML = `
    <div class="editorial-hero-grid">
      <!-- Coluna Esquerda: Posicionamento Profissional -->
      <div class="editorial-copy-col">
        <span class="editorial-eyebrow">${escapeHtml(config.eyebrow)}</span>
        <h1 class="editorial-headline">${escapeHtml(config.headline)}</h1>
        <p class="editorial-description">${escapeHtml(config.description)}</p>
      </div>

      <!-- Coluna Direita: Showreel / Mídia de Destaque com poster vertical -->
      <div class="editorial-media-col">
        <div class="editorial-card" role="button" tabindex="0" aria-label="Assistir ${escapeHtml(config.showreelTitle)}">
          <div class="editorial-poster-wrap">
            <img class="editorial-poster" src="${escapeHtml(config.posterUrl)}" alt="${escapeHtml(config.showreelTitle)}" loading="eager" />
            <div class="editorial-play-btn" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="7 5 19 12 7 19 7 5"></polygon>
              </svg>
            </div>
            ${durationHtml}
          </div>
          <div class="editorial-media-caption">
            <span class="editorial-media-title">${escapeHtml(config.showreelTitle)}</span>
            <span class="editorial-media-action">
              Assistir
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  const card = section.querySelector<HTMLElement>(".editorial-card");
  if (card && options.onPlayShowreel) {
    card.addEventListener("click", () => options.onPlayShowreel?.());
    card.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        options.onPlayShowreel?.();
      }
    });
  }

  return section;
}
