# Portfolio UX, Conversion & Technical Bugfix Design

**Date:** 2026-11-24
**Scope:** Improvements from Groups 1 (Portfolio & Conversion) and 2 (Code Bugs), plus coupled test/admin-sync fixes. Existing `unsplash.com` placeholder images remain unchanged for now.

## Intent & Goals

Make the public portfolio convert clients clearly across all offered services (video editing, design, and AI), eliminate layout/player/admin bugs, and remove fragile HTML regex syncing without breaking static GitHub Pages hosting or local `file://` previewing.

### Non-Goals
- No replacement of existing `images.unsplash.com` design/IA placeholders or `og:image` in this phase.
- No backend database, bundler, or npm dependencies (stays 100% vanilla HTML/CSS/JS + Node stdlib for local `scripts/server.js`).
- No removal of `portf_lio_alan_oliveira.html` or full SEO/schema rewrite beyond keeping existing metadata valid and adding a visible `<h1>` in the Home Hero.

## Constraints
- Must run seamlessly on GitHub Pages (static root) and via local `file://` opening (`projects.js` via `<script src>`, not `fetch('projects.json')` which fails under `file://` CORS).
- Preserve the dark editorial visual aesthetic (`#111111` background, `#181818` surface, `Inter` + `Plus Jakarta Sans`).
- Preserve existing `localStorage` key `portfolio_projects` and `Ctrl+Shift+A` shortcut to `admin.html`.
- No build tools or external JS/CSS libraries.

## Approaches Considered

1. **Approach A — Shared `projects.js` + JS Column Masonry (Selected):**
   - Move `PROJECTS` / `DEFAULT_PROJECTS` into a single `projects.js` file (`window.DEFAULT_PROJECTS = [...]`) loaded by `index.html` and `admin.html`.
   - Render `.masonry-grid` as responsive vertical flex columns (`4` desktop, `3` `<=900px`, `2` `<=768px`, `1` `<=480px`) placing each item into the currently shortest column based on its aspect ratio.
   - Trade-off: Adds one static file (`projects.js`) and updates `admin.html` / `scripts/server.js` commit target to `projects.js`, in exchange for eliminating duplicate project arrays, fragile HTML regex writes, and CSS Grid row gaps while preserving `#1..#4` left-to-right top placement.
2. **Approach B — Keep Inline Arrays + CSS `column-count` (Rejected):**
   - Trade-off: Zero new files, but keeps duplicate arrays/regex rewriting and flows `#1, #2, #3...` down the leftmost column first, breaking the Admin panel's top-row ordering intuition.

## Architecture & Component Changes

### 1. Shared Data Source (`projects.js`)
- Create `projects.js` containing `window.DEFAULT_PROJECTS = [...]` with the current 21 project objects (omitting `visible` when `true`, preserving `visible: false` when hidden).
- Both `index.html` and `admin.html` load `<script src="projects.js"></script>` before their inline `<script>` and read `window.DEFAULT_PROJECTS || []` as fallback when `localStorage.getItem("portfolio_projects")` is empty/invalid.
- Remove `CONFIG.PROJECTS` from `index.html` and `DEFAULT_PROJECTS` from `admin.html`.

### 2. Public Portfolio (`index.html`)
- **Hero & CTA:**
  - Add a compact `.hero-strip` inside `<main>` right above `#gallery-grid`, visible when `state.activeCategory !== "sobre"`.
  - Contains `<h1 class="hero-title">Edição de vídeo, design e soluções com IA para marcas e criadores.</h1>` and a subtle pill CTA link `#hero-whatsapp` (`Orçamento no WhatsApp`), populated by `initContacts()`.
  - Update `CONFIG.WHATSAPP_MESSAGE` to `"Olá Alan, vi seu portfólio e gostaria de conversar sobre um projeto."`.
- **Footer & Admin Entry:**
  - Remove the public `<a href="admin.html">painel admin</a>` link from `<footer>` (keep only `Alan Oliveira` with readable `#999999` muted contrast). Keep `Ctrl+Shift+A` shortcut and direct `/admin.html` URL working.
- **JS Column Masonry (`renderGallery`):**
  - Replace CSS `display: grid` on `.masonry-grid` with `display: flex; align-items: flex-start; gap: var(--gap)`.
  - Compute column count by viewport width (`<=480: 1`, `<=768: 2`, `<=900: 3`, else `4`) via `getColumnCount()`.
  - Create `colCount` `.masonry-col` containers (`flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--gap)`).
  - Track estimated height per column using ratio weights (`ratio-9-16: 16/9`, `ratio-16-9: 9/16`, `ratio-4-3: 3/4`, `ratio-3-2: 2/3`) plus gap constant `0.08`, placing each item in the shortest column so `#1..#4` always populate the top row left-to-right with zero row gaps.
  - Add a debounced `resize` listener that re-renders only when `getColumnCount()` changes.
  - If filtered items are empty, display a clean centered empty-state message inside `#gallery-grid`.
- **Mobile Card Visibility & XSS-Safe Rendering:**
  - Escape all interpolated strings (`escapeHtml`) and validate image URLs (`isSafeImageUrl`: allows `https://`, `http://`, or relative `assets/...`) when building cards and lightbox content.
  - Under `@media (hover: none), (max-width: 768px)`, show `.masonry-overlay` (`opacity: 1`) so touch users always see the title, and show `.play-indicator` subtly (`opacity: 0.8`) on video cards.
- **Thumbnail Fallback Queue:**
  - For YouTube items, cycle sequentially through `maxresdefault.jpg` → `sddefault.jpg` → `hqdefault.jpg` using an index counter on `load` (`naturalWidth <= 120`) and `error`.
  - For `design` image items, attach an `error` handler that applies `.has-media-error` fallback styling so broken external images never leave a raw broken-image icon.
- **Subcategory Filtering (`renderSubNav`):**
  - Keep curated label definitions in `SUBCATEGORIES` per category, but filter dynamically so only tags matching at least 2 visible items in `state.activeCategory` are shown alongside `"todos"`. If fewer than 2 tag buttons qualify, hide `#sub-nav`.
- **Lightbox Controls, Caption & Focus:**
  - Update YouTube embed URL in `renderLightboxContent` to `controls=1` (keeping `autoplay=1&rel=0&modestbranding=1&playsinline=1`, removing `disablekb=1`).
  - Render `<div id="lightbox-caption" class="lightbox-caption"></div>` inside `.lightbox-stage` below `#lightbox-content` showing `item.title` and category label via `.textContent`.
  - Store `lastFocusedElement` on `openLightbox`, move focus to `#lightbox-close`, trap `Tab`/`Shift+Tab` across lightbox controls while open, and return focus on `closeLightbox`.
- **URL Hash Sync (`setCategory`):**
  - Sync `window.location.hash` on tab changes (`#home`, `#video`, `#design`, `#ia`, `#sobre`) without creating duplicate history loops, and handle `window.addEventListener("hashchange", ...)` so browser Back/Forward switches views properly.
- **Dead Code Removal:**
  - Remove unused inline-video playback code (`currentPlayingCard`, `stopCurrentInlineVideo`, `playInlineVideo`, `.masonry-item.is-playing`, `.inline-video-iframe`, `.inline-close-btn`) and unused `.ratio-21-9` / `.ratio-16-10` CSS rules.

### 3. Admin Panel (`admin.html`)
- **Media Type & Aspect Ratio Fix:**
  - Add `<select id="input-type">` (`video` = "Vídeo (YouTube)", `design` = "Imagem (URL / Arquivo)") decoupled from `#input-category` (`video`, `ia`, `design`).
  - Support `"9:16"`, `"16:9"`, `"4:3"`, and `"3:2"` in `#input-aspect`, mapping cleanly to `ratio-9-16`, `ratio-16-9`, `ratio-4-3`, `ratio-3-2`.
  - Dynamically update `#input-yt-url` label/placeholder/preview for YouTube ID/URL vs image URL/path (`assets/...`).
  - On submit, store `id` (and delete `image`) when `type === "video"`, or store `image` (and delete `id`, `aspect` if unneeded or keep normalized `aspect`/`ratio`) when `type === "design"` — preventing `ia` image items from turning into broken videos.
- **Safe Rendering & Drag Polish:**
  - Escape project fields with `escapeHtml` in `renderCards` and validate `thumbUrl`.
  - Show exact aspect badge (`9:16`, `16:9`, `4:3`, `3:2`) instead of labeling `4:3`/`3:2` as `"16:9 Wide"`.
  - In `dragleave`, check `!card.contains(e.relatedTarget)` before removing `.drag-over-active` to prevent flicker over child nodes.
- **GitHub API & Code Export Target:**
  - Update `openCodeModal` and `pushToGitHubAPI` to output and commit `projects.js` (`window.DEFAULT_PROJECTS = ...;\n`) instead of regex-patching `index.html` and `admin.html`. Handle HTTP `404` on `GET /contents/projects.js` so initial file creation works without `sha`.
  - Note Fine-grained PAT (scoped to `portfolio`) alongside the GitHub token instructions.

### 4. Local Save Server (`scripts/server.js`)
- Bind `server.listen(PORT, '127.0.0.1')`.
- Restrict `Access-Control-Allow-Origin` and `POST /api/save-git` to local origins (`http://localhost:8089`, `http://127.0.0.1:8089`, or absent `Origin`). Reject foreign origins with `403`.
- Validate incoming `projects` array items before writing `projects.js`.
- Write `projects.js` directly instead of regex-patching `index.html`/`admin.html`.
- Check `git status --porcelain projects.js`; if empty, return `200` with `"Nenhuma alteração pendente para enviar."` instead of throwing `500` on empty `git commit`.

### 5. Automated Validation (`scripts/test-portfolio.js`)
- Replace fixed 13-ID and dead `playInlineVideo` checks with:
  - Loading `projects.js` in a `vm` sandbox and asserting `Array.isArray(window.DEFAULT_PROJECTS)` and schema validity for every item (`type` in `["video", "design"]`, valid `category`, non-empty `title`, valid `ratio`, `tags` array, `id` for `video`, `image` for `design`).
  - Validating `index.html` and `admin.html` inline JS syntax with `vm.Script`, presence of `<script src="projects.js"></script>`, Hero CTA, lightbox `controls=1`, `lightbox-caption`, `escapeHtml`, and absence of `href="admin.html"` in the public footer of `index.html`.
  - Unit-style checks for helper logic (e.g. `admin.html` preserving `type: "design"` inside `category: "ia"`, and `scripts/server.js` syntax check).

## Open for Builder Decisions
- Exact CSS spacing/typography polish for `.hero-strip` and `.lightbox-caption`, and exact DOM helper refactoring structure inside `index.html`/`admin.html` (kept minimal per YAGNI).
