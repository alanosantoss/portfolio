/**
 * Seção de Prova Social Editorial e Discreta
 * Comunica anos de experiência prática, entregas verificadas e pilares profissionais
 * sem contadores artificiais ou dados fabricados.
 */
export function createSocialProofComponent(): HTMLElement {
  const container = document.createElement("section");
  container.className = "social-proof-section";
  container.setAttribute("aria-label", "Experiência e Credenciais");

  container.innerHTML = `
    <div class="social-proof-grid">
      <div class="social-proof-item">
        <span class="proof-number">Audiovisual</span>
        <span class="proof-label">Edição dinâmica, sound design e ritmo pensados para retenção e impacto.</span>
      </div>
      <div class="social-proof-item">
        <span class="proof-number">Direção Criativa</span>
        <span class="proof-label">Composição editorial, identidade visual e key visuals consistentes.</span>
      </div>
      <div class="social-proof-item">
        <span class="proof-number">Tecnologia Criativa</span>
        <span class="proof-label">IA generativa, ferramentas personalizadas e automações de fluxo.</span>
      </div>
      <div class="social-proof-item">
        <span class="proof-number">+100 Projetos</span>
        <span class="proof-label">Entregas em publicidade, criativos de alta conversão e branding.</span>
      </div>
    </div>
  `;

  return container;
}
