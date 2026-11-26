# Portfólio — Alan Oliveira

Portfólio minimalista e editorial de edição de vídeo, motion e direção criativa, com player cinema integrado (lightbox) para vídeos do YouTube, painel administrativo e publicação automatizada no **GitHub Pages**.

---

## Arquitetura

- **Frontend:** Vanilla TypeScript + Vite (MPA: `index.html` e `admin.html`)
- **Estilização:** CSS modularizado com Design Tokens (`src/styles/`)
- **Animações:** GSAP (`gsap`, `Flip`, `CustomEase`)
- **Testes:** Vitest (unitários e integração) + Playwright (E2E)
- **Qualidade:** ESLint + Prettier
- **Base de Projetos:** `public/projects.js` (`window.DEFAULT_PROJECTS`)

Consulte `AGENTS.md` e a pasta `docs/` para detalhes arquiteturais.

---

## Scripts de Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento (Vite HMR)
npm run dev

# Servidor administrativo local (127.0.0.1:8089)
npm run server

# Desenvolvimento + servidor local juntos
npm run dev:all

# Verificação de tipos e lint
npm run typecheck
npm run lint

# Formatação
npm run format
npm run format:check

# Testes unitários e de integração (Vitest)
npm test

# Testes end-to-end (Playwright)
npm run test:e2e

# Build de produção (dist/)
npm run build
npm run preview
```

---

## Publicação (GitHub Pages)

O workflow `.github/workflows/deploy.yml` executa `npm ci`, `typecheck`, `lint`, `test`, `build` e publica automaticamente a pasta `dist/` no GitHub Pages a cada push na branch `main`.
