/**
 * Componente Showreel Reutilizável
 * Apresentação widescreen 16:9 cinematográfica com pôster otimizado, botão minimalista de play
 * e inicialização do vídeo sob demanda.
 */
import { escapeHtml } from "../utils/security";

export interface ShowreelOptions {
  title?: string;
  description?: string;
  duration?: string;
  posterUrl?: string;
  videoUrl?: string;
  onPlay?: () => void;
}

export function createShowreelComponent(options: ShowreelOptions): HTMLElement {
  const section = document.createElement("section");
  section.className = "showreel-section";
  section.setAttribute("aria-label", "Showreel");

  const title = options.title || "Showreel 2026";
  const desc = options.description || "Uma seleção dos meus melhores trabalhos em edição, motion e direção criativa.";
  const duration = options.duration ? `<span class="showreel-duration">${escapeHtml(options.duration)}</span>` : "";
  const poster = options.posterUrl || "https://i.ytimg.com/vi/aNsA0iwBbqc/maxresdefault.jpg";

  section.innerHTML = `
    <div class="showreel-card">
      <div class="showreel-media" role="button" tabindex="0" aria-label="Assistir ${escapeHtml(title)}">
        <img class="showreel-poster" src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" />
        <div class="showreel-play-btn" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7 5 19 12 7 19 7 5"></polygon>
          </svg>
        </div>
        ${duration}
      </div>
      <div class="showreel-meta">
        <div class="showreel-badge">Destaque Audiovisual</div>
        <h3 class="showreel-title">${escapeHtml(title)}</h3>
        <p class="showreel-desc">${escapeHtml(desc)}</p>
      </div>
    </div>
  `;

  const mediaEl = section.querySelector<HTMLElement>(".showreel-media");
  if (mediaEl) {
    const handleAction = () => {
      if (options.onPlay) {
        options.onPlay();
      }
    };
    mediaEl.addEventListener("click", handleAction);
    mediaEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleAction();
      }
    });
  }

  return section;
}
