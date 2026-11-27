/**
 * Introdução Profissional Compacta e Pilares de Atuação
 * Posicionamento editorial para a Home:
 * Audiovisual, Direção Criativa e Tecnologia Criativa aplicados à comunicação de marcas.
 */
import { pushCategoryHash } from "../core/router";

export function createHomeIntroComponent(): HTMLElement {
  const container = document.createElement("section");
  container.className = "home-intro-section";
  container.setAttribute("aria-label", "Apresentação Profissional e Áreas de Atuação");

  container.innerHTML = `
    <div class="home-intro-hero">
      <div class="home-intro-tag">Creative Designer & Video Editor</div>
      <h2 class="home-intro-headline">Audiovisual, direção criativa e tecnologia aplicados à comunicação de marcas.</h2>
      <p class="home-intro-bio">
        Edição de alto impacto, composição gráfica refinada e creative technology com inteligência artificial para marcas e criadores que buscam retenção e autoridade visual.
      </p>
    </div>

    <div class="home-pillars-grid">
      <div class="pillar-card" role="button" tabindex="0" data-target-category="video" aria-label="Explorar área de Audiovisual">
        <div class="pillar-header">
          <span class="pillar-idx">01</span>
          <h3 class="pillar-title">Audiovisual</h3>
        </div>
        <p class="pillar-desc">Edição de vídeo, motion design, publicidade, color grading e narrativa visual focados em retenção e dinamismo.</p>
        <div class="pillar-tags">
          <span>Edição de Vídeo</span>
          <span>Motion Design</span>
          <span>Publicidade</span>
          <span>Color Grading</span>
          <span>Narrativa Visual</span>
        </div>
      </div>

      <div class="pillar-card" role="button" tabindex="0" data-target-category="design" aria-label="Explorar área de Design & Direção Criativa">
        <div class="pillar-header">
          <span class="pillar-idx">02</span>
          <h3 class="pillar-title">Design & Direção Criativa</h3>
        </div>
        <p class="pillar-desc">Identidade visual, comunicação, campanhas e composição gráfica com estética contemporânea e sólida.</p>
        <div class="pillar-tags">
          <span>Identidade Visual</span>
          <span>Comunicação</span>
          <span>Campanhas</span>
          <span>Composição Gráfica</span>
        </div>
      </div>

      <div class="pillar-card" role="button" tabindex="0" data-target-category="ia" aria-label="Explorar área de Creative Technology">
        <div class="pillar-header">
          <span class="pillar-idx">03</span>
          <h3 class="pillar-title">Creative Technology</h3>
        </div>
        <p class="pillar-desc">Inteligência artificial generativa, automações, desenvolvimento de ferramentas e soluções digitais inovadoras.</p>
        <div class="pillar-tags">
          <span>IA Generativa</span>
          <span>Automações</span>
          <span>Ferramentas Digitais</span>
          <span>Soluções Digitais</span>
        </div>
      </div>
    </div>
  `;

  // Bind clicks para navegar direto para as categorias correspondentes
  container.querySelectorAll<HTMLElement>(".pillar-card").forEach((card) => {
    const targetCat = card.dataset.targetCategory;
    if (!targetCat) return;

    const navigate = () => {
      pushCategoryHash(targetCat as "video" | "design" | "ia");
    };

    card.addEventListener("click", navigate);
    card.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate();
      }
    });
  });

  return container;
}
