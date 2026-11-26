# Arquitetura do Portfólio

## Visão Geral
Aplicação multipágina (MPA) em **Vite + Vanilla TypeScript**, com duas entradas HTML:
- `index.html` → `src/main.ts` (site público)
- `admin.html` → `src/admin/main.ts` (painel administrativo)

## Camadas e Responsabilidades
- **Core (`src/core/`):**
  - `app.ts`: Controlador principal. Executa inicialização idempotente, coordena componentes e registra listeners globais (`storage`, `resize`, `keydown`, `hashchange`, `popstate`).
  - `state.ts`: Store leve com `getState()`, `setState()` e `subscribeState()`.
  - `router.ts`: Roteamento por `#hash` (`home`, `video`, `design`, `ia`, `sobre`) com fallback caso `history.pushState` lance `SecurityError`.
  - `config.ts`: Configurações estáticas (`CONFIG`, `SUBCATEGORIES`, `INTRO_CONFIG`).
- **Componentes (`src/components/`):**
  - `gallery.ts` e `project-card.ts`: Grid Masonry balanceado por menor altura acumulada (4 colunas > 900px, 3 colunas <= 900px, 2 colunas <= 768px).
  - `header.ts` e `filters.ts`: Navegação de 2 níveis (divisões principais + subcategorias com mínimo de 2 itens por tag e 2 tags qualificadas).
  - `welcome-gate.ts`: Triagem inicial com trava opcional de categoria e botão `trocar área`.
  - `lightbox.ts`: Visualização em tela cheia com player `youtube-nocookie.com` (`controls=0`) ou imagem, navegação por setas/teclado e focus trap.
  - `quote-modal.ts`: Pré-orçamento em tela única com composição automática de mensagem para WhatsApp.
- **Serviços (`src/services/`) e Utilitários (`src/utils/`):**
  - `projects.ts`, `thumbnails.ts`, `storage.ts`, `whatsapp.ts`, `security.ts`, `media.ts`, `dom.ts`, `preload.ts`.
