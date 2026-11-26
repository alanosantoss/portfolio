# Schema de Dados e Persistência

## Fonte Canônica (`public/projects.js`)
Define `window.DEFAULT_PROJECTS` como array de `ProjectItem`:

```ts
interface ProjectItem {
  type: "video" | "design";
  category: "video" | "design" | "ia";
  title: string;
  id?: string;       // Obrigatório quando type === "video" (ID YouTube de 11 chars)
  image?: string;    // Obrigatório quando type === "design" (URL https:// ou caminho assets/)
  aspect?: "9:16" | "16:9" | "4:3" | "3:2";
  ratio?: "ratio-9-16" | "ratio-16-9" | "ratio-4-3" | "ratio-3-2";
  tags?: string[];
  visible?: boolean; // Omitido quando true em public/projects.js; false oculta no site público
}
```

## Chaves de Armazenamento
- `localStorage`:
  - `portfolio_projects`: Lista editada pelo painel admin (sincronizada entre abas via evento `storage`).
  - `portfolio_gh_token`: Token do GitHub salvo apenas localmente pelo usuário no painel admin.
- `sessionStorage`:
  - `portfolio_intro_seen`: `"1"` após conclusão da introdução cinematográfica.
  - `portfolio_welcome_seen`: `"1"` após seleção ou fechamento do Welcome Gate.
  - `portfolio_welcome_cat`: Categoria travada (`video` | `design` | `ia`).
