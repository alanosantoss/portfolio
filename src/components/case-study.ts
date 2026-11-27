/**
 * Componente de Apresentação de Estudo de Caso Editorial Completo
 * Apresenta hero com mídia principal, desafio criativo, papel, processo,
 * antes/depois interativo (quando disponível), métricas e CTA contextual de orçamento.
 */
import type { ProjectItem } from "../types/project";
import { getYouTubeEmbedUrl } from "../utils/media";
import { escapeHtml, isSafeImageUrl } from "../utils/security";
import { createBeforeAfterComponent } from "./before-after";

export interface CaseStudyOptions {
  project: ProjectItem;
  onClose: () => void;
  onRequestQuote: (project: ProjectItem) => void;
  onShare: (project: ProjectItem) => void;
}

export function createCaseStudyView(options: CaseStudyOptions): HTMLElement {
  const { project, onClose, onRequestQuote, onShare } = options;
  const isVideo = project.type === "video";
  const safeTitle = escapeHtml(project.title);

  const container = document.createElement("div");
  container.className = "case-study-overlay is-open";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-label", `Estudo de Caso: ${project.title}`);

  // Contextual quote message label
  const quoteContextLabel =
    project.category === "video"
      ? "Precisa de um vídeo de alto impacto como este?"
      : project.category === "ia"
        ? "Precisa de uma solução com inteligência artificial como esta?"
        : "Precisa de uma direção de arte como esta?";

  let mediaHtml = "";
  if (isVideo && project.id) {
    const embedUrl = getYouTubeEmbedUrl(project.id);
    const isVertical = project.aspect === "9:16" || project.ratio === "ratio-9-16";
    mediaHtml = `
      <div class="case-study-media-wrap ${isVertical ? "is-vertical" : ""}">
        <iframe
          src="${embedUrl}"
          title="${safeTitle}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    `;
  } else if (isSafeImageUrl(project.image)) {
    mediaHtml = `
      <div class="case-study-media-wrap">
        <img src="${escapeHtml(project.image)}" alt="${safeTitle}" class="case-study-main-img" />
      </div>
    `;
  }

  // Tags and metadata pills
  const deliverables = (project.deliverables || project.services || [])
    .map((item) => `<span class="case-study-pill">${escapeHtml(item)}</span>`)
    .join("");

  const tools = (project.tools || [])
    .map((tool) => `<span class="case-study-pill tool-pill">${escapeHtml(tool)}</span>`)
    .join("");

  const outcomes = (project.outcomes || [])
    .map(
      (o) => `
      <div class="case-study-outcome-card">
        <span class="outcome-value">${escapeHtml(o.value)}</span>
        <span class="outcome-label">${escapeHtml(o.label)}</span>
        ${o.context ? `<span class="outcome-context">${escapeHtml(o.context)}</span>` : ""}
      </div>
    `
    )
    .join("");

  container.innerHTML = `
    <div class="case-study-backdrop"></div>
    <div class="case-study-container">
      <header class="case-study-header">
        <div class="case-study-header-left">
          <span class="case-study-badge">${escapeHtml(project.category.toUpperCase())}</span>
          ${project.client ? `<span class="case-study-client">Cliente: ${escapeHtml(project.client)}</span>` : ""}
        </div>
        <div class="case-study-header-actions">
          <button type="button" class="case-study-action-btn btn-share" aria-label="Compartilhar projeto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            <span class="share-label">Copiar Link</span>
          </button>
          <button type="button" class="case-study-close-btn" aria-label="Fechar estudo de caso">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <div class="case-study-body">
        <div class="case-study-hero">
          <h1 class="case-study-title">${safeTitle}</h1>
          ${project.summary ? `<p class="case-study-lead">${escapeHtml(project.summary)}</p>` : ""}
          <div class="case-study-media-stage">${mediaHtml}</div>
        </div>

        <div class="case-study-grid-details">
          <div class="case-study-col-main">
            ${
              project.description
                ? `
              <div class="case-study-section">
                <h2 class="case-study-section-title">Contexto & Desafio</h2>
                <p class="case-study-text">${escapeHtml(project.description)}</p>
              </div>
            `
                : ""
            }

            <div id="before-after-slot"></div>

            ${
              project.demoUrl && isSafeImageUrl(project.demoUrl)
                ? `
              <div class="case-study-section">
                <h2 class="case-study-section-title">Demonstração Interativa</h2>
                <a href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer" class="case-study-demo-link">
                  Acessar Demonstração ao Vivo
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M7 17L17 7M17 7H7M17 7V17"></path>
                  </svg>
                </a>
              </div>
            `
                : ""
            }
          </div>

          <aside class="case-study-col-sidebar">
            ${
              deliverables
                ? `
              <div class="case-study-sidebar-block">
                <h3 class="sidebar-block-title">Entregas & Serviços</h3>
                <div class="pill-group">${deliverables}</div>
              </div>
            `
                : ""
            }

            ${
              tools
                ? `
              <div class="case-study-sidebar-block">
                <h3 class="sidebar-block-title">Ferramentas</h3>
                <div class="pill-group">${tools}</div>
              </div>
            `
                : ""
            }

            ${
              outcomes
                ? `
              <div class="case-study-sidebar-block">
                <h3 class="sidebar-block-title">Resultados Verificados</h3>
                <div class="outcomes-grid">${outcomes}</div>
              </div>
            `
                : ""
            }
          </aside>
        </div>

        <!-- Conversão Contextual -->
        <section class="case-study-cta-box">
          <div class="cta-box-text">
            <h3>${escapeHtml(quoteContextLabel)}</h3>
            <p>Converse diretamente comigo sobre escopo, prazos e direcionamento visual.</p>
          </div>
          <button type="button" class="btn btn-quote-action">
            Solicitar Orçamento
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </button>
        </section>
      </div>
    </div>
  `;

  // Anexar componente Before-After se ambas as imagens existirem
  if (project.beforeImage && project.afterImage) {
    const slot = container.querySelector("#before-after-slot");
    if (slot) {
      const baEl = createBeforeAfterComponent({
        beforeUrl: project.beforeImage,
        afterUrl: project.afterImage,
        beforeLabel: "Original / Sem Grade",
        afterLabel: "Pós-Produção Final",
        alt: `Comparação antes e depois para ${project.title}`
      });
      const section = document.createElement("div");
      section.className = "case-study-section";
      section.innerHTML = `<h2 class="case-study-section-title">Processo Criativo: Antes & Depois</h2>`;
      section.appendChild(baEl);
      slot.replaceWith(section);
    }
  }

  // Event Listeners
  const backdrop = container.querySelector(".case-study-backdrop");
  const closeBtn = container.querySelector(".case-study-close-btn");
  const shareBtn = container.querySelector(".btn-share");
  const quoteBtn = container.querySelector(".btn-quote-action");

  backdrop?.addEventListener("click", onClose);
  closeBtn?.addEventListener("click", onClose);
  shareBtn?.addEventListener("click", () => onShare(project));
  quoteBtn?.addEventListener("click", () => onRequestQuote(project));

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };
  window.addEventListener("keydown", handleKeyDown);

  // Armazena remoção do listener na desmontagem
  (container as unknown as { _cleanup?: () => void })._cleanup = () => {
    window.removeEventListener("keydown", handleKeyDown);
  };

  return container;
}
