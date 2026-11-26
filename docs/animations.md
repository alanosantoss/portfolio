# Arquitetura de Animações (GSAP)

## Registro Central
`src/animations/gsap.ts` importa explicitamente `gsap`, `Flip` (`gsap/Flip`) e `CustomEase` (`gsap/CustomEase`), registra os plugins uma única vez via `ensureGsapPlugins()` e adiciona a classe `has-gsap-flip` em `<html>`.

## Módulos
- `src/animations/easing.ts`: Registra as curvas `introMorph`, `introReveal`, `introReel` e `introExit` a partir de `INTRO_CONFIG.eases`.
- `src/animations/cinematic-intro.ts`: Executa a abertura em 7 fases (linha inicial → revelação vertical 9:16 → reel de projetos → marca → morph geométrico para o card de `#welcome-gate` → backdrop → conteúdo). Respeita `prefers-reduced-motion` e `sessionStorage.portfolio_intro_seen`.
- `src/animations/gate-transition.ts`: Anima a saída do Welcome Gate e limpa propriedades inline ao concluir.
- `src/animations/lightbox-transition.ts`: Anima abertura, fechamento e troca de slides do Lightbox usando o retângulo do card de origem, com cancelamento seguro de tweens ativos.
