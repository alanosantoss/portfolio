# Build, Servidor Local e Deploy

## Scripts Disponíveis
- `npm run dev`: Servidor Vite com HMR (`http://127.0.0.1:5173`) e proxy `/api` para `127.0.0.1:8089`.
- `npm run server`: Inicia o servidor Node.js local (`scripts/server.js`) em `127.0.0.1:8089`.
- `npm run dev:all`: Inicia Vite e `scripts/server.js` simultaneamente.
- `npm run build`: Executa `tsc --noEmit` e gera o bundle de produção em `dist/`.
- `npm run preview`: Pré-visualiza `dist/` localmente.
- `npm run typecheck`: Verificação estrita TypeScript.
- `npm run lint`: ESLint.
- `npm test`: Suíte Vitest (unitários + integração).
- `npm run test:e2e`: Suíte Playwright contra `vite preview`.

## GitHub Pages e CI/CD
O workflow `.github/workflows/deploy.yml` executa em pushes na branch `main`:
1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build`
6. Publicação da pasta `dist/` via `actions/upload-pages-artifact` e `actions/deploy-pages`.

O `base: "./"` em `vite.config.ts` garante funcionamento tanto em subdiretório (`/portfolio/`) quanto em domínio próprio.
