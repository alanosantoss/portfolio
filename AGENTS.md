# AGENTS.md — Guia Operacional para Agentes de IA

## Visão Geral e Stack
Portfólio editorial minimalista de Alan Oliveira (edição de vídeo, design e IA), com painel administrativo local/GitHub.
- **Frontend:** Vanilla TypeScript (strict), HTML MPA (`index.html`, `admin.html`), CSS modular com Design Tokens.
- **Build:** Vite (`vite.config.ts`, `base: "./"` para compatibilidade com subdiretório e domínio próprio).
- **Animações:** GSAP (`gsap`, `Flip`, `CustomEase` via npm, centralizado em `src/animations/gsap.ts`).
- **Qualidade:** ESLint, Prettier, Vitest (`tests/unit`, `tests/integration`) e Playwright (`tests/e2e`).
- **Servidor local admin:** `scripts/server.js` (CommonJS, `127.0.0.1:8089`).

## Mapa da Arquitetura
- `public/projects.js`: **Fonte canônica única** de `window.DEFAULT_PROJECTS`. Suporta metadados estendidos do Portfolio 2.0 (`slug`, `client`, `summary`, `description`, `services`, `tools`, `deliverables`, `outcomes`, `beforeImage`, `afterImage`, `featured`, `caseStudy`).
- `src/main.ts`: Ponto de entrada único do site público; delega para `src/core/app.ts`.
- `src/core/`: `app.ts` (orquestração e inicialização idempotente), `state.ts` (estado centralizado), `router.ts` (roteamento por `#hash`, suporte a `#project/:slug` com fallback de `SecurityError`), `config.ts` (contatos, subcategorias, tokens de intro).
- `src/components/`: `header.ts`, `filters.ts`, `gallery.ts`, `project-card.ts`, `lightbox.ts`, `welcome-gate.ts`, `quote-modal.ts`, `showreel.ts`, `before-after.ts`, `case-study.ts`, `home-intro.ts`, `social-proof.ts`.
- `src/animations/`: `gsap.ts` (registro único), `easing.ts`, `cinematic-intro.ts`, `gate-transition.ts`, `lightbox-transition.ts`.
- `src/services/`: `projects.ts` (validação, normalização, filtros, slugs), `thumbnails.ts` (fallback YouTube), `storage.ts` (wrapper seguro), `whatsapp.ts` (orçamentos contextuais), `analytics.ts` (eventos de conversão), `video-preview.ts` (previews leves em hover), `i18n.ts` (dicionário de internacionalização).
- `src/utils/`: `security.ts` (`escapeHtml`, `isSafeImageUrl`, `extractYouTubeId`), `media.ts`, `dom.ts`, `preload.ts`.
- `src/styles/`: CSS modularizado em `tokens.css`, `reset.css`, `global.css`, `header.css`, `filters.css`, `layout.css`, `gallery.css`, `lightbox.css`, `welcome-gate.css`, `quote-modal.css`, `portfolio-evolution.css`, `animations.css`, `responsive.css`, agregados por `index.css`.
- `src/admin/`: `main.ts`, `editor.ts`, `project-manager.ts`, `github.ts`, `storage.ts`, `admin.css`.

## Fluxo de Inicialização (`src/core/app.ts`)
1. `<script data-intro-boot>` no `<head>` aplica `html.intro-pending` antes da primeira pintura.
2. `initApp()` garante idempotência, registra plugins GSAP, valida nós obrigatórios do DOM e lê projetos.
3. Inicializa contatos, modal de orçamento, navegação, lightbox e listeners globais (`hashchange`, `popstate`, `storage`, `resize`, `keydown`).
4. Renderiza categoria inicial e dispara `runCinematicIntro`, que ao concluir inicia `welcomeGateController.init()`.

## Regras Críticas e Segurança
- **Nunca** use `any`, `@ts-ignore` ou desative regras de segurança para contornar erros de tipo.
- **Sempre** sanitize conteúdo dinâmico com `escapeHtml()` e valide URLs externas com `isSafeImageUrl()` antes de inserir no DOM.
- **Nunca** exponha tokens do GitHub no bundle; o token fica apenas em `localStorage` (`portfolio_gh_token`).
- **Animações:** A camada `src/animations/` não deve alterar rotas, persistir dados ou renderizar projetos.
- **Identidade visual:** Preserve paleta (`#111111`, `#181818`, `#ffffff`, `#999999`), tipografia (`Inter`, `Plus Jakarta Sans`) e proporções (`9:16`, `16:9`, `4:3`, `3:2`).

## Documentação Detalhada
Consulte antes de alterar:
- Arquitetura e fluxo: `docs/architecture.md`
- Animações GSAP: `docs/animations.md`
- Schema de projetos e storage: `docs/data-schema.md`
- Build e deploy: `docs/deployment.md`

## Procedimentos de Verificação
Antes de concluir qualquer alteração:
```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e
```
