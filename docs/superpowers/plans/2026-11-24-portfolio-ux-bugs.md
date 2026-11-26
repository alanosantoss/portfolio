# Portfolio UX, Conversion & Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve portfolio conversion (Hero CTA, mobile/lightbox titles, aligned subcategories) and fix all technical bugs across `index.html`, `admin.html`, `scripts/server.js`, and `scripts/test-portfolio.js` using a shared `projects.js` catalog.

**Architecture:** Extract the 21 default project entries from `index.html` and `admin.html` into `projects.js` (`window.DEFAULT_PROJECTS`) so both pages work over HTTP and `file://` without HTML regex rewriting. Replace the CSS Grid layout in `index.html` with shortest-column flex masonry, harden DOM interpolation and `scripts/server.js` localhost checks, decouple media `type` from `category` in `admin.html`, and verify all behaviors with `scripts/test-portfolio.js`.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES6+), Node.js (stdlib `http`, `fs`, `path`, `vm`, `assert`, `child_process`), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-24-portfolio-ux-bugs-design.md`

## Global Constraints
- Zero build tools, bundlers, or external runtime/npm dependencies.
- Keep existing dark editorial palette (`#111111` bg, `#181818` surface, `Inter` & `Plus Jakarta Sans`) and existing `images.unsplash.com` URLs unchanged.
- Preserve `localStorage` key `"portfolio_projects"` and `Ctrl+Shift+A` shortcut to `admin.html`.
- Must work identically when hosted on GitHub Pages and when opened directly via `file://`.
- Maintain existing comments/docstrings unrelated to changes.

## Review Focus
- **Corrupted or empty `localStorage` (`"portfolio_projects"`):** `[]`, invalid JSON, or missing `window.DEFAULT_PROJECTS` must fall back cleanly to `window.DEFAULT_PROJECTS || []` without crashing `index.html` or `admin.html` (covered in Task 1).
- **Editing `ia` image items in `admin.html`:** Editing an item with `category: "ia"`, `type: "design"`, `ratio: "ratio-4-3"`, and an `image` URL must preserve `type: "design"`, `image`, and `ratio-4-3`, without leaving a stale `id` property (covered in Task 5).
- **HTML injection & unsafe image URLs:** Titles containing `"`, `<`, `>` (e.g. `Teste "Aspas" <img onerror=alert(1)>`) or URLs using `javascript:` must be escaped by `escapeHtml` and blocked by `isSafeImageUrl` across cards and lightbox (covered in Tasks 3 & 5).
- **GitHub API first publish (`404`) & local no-op saves:** `pushToGitHubAPI` must omit `sha` when `GET /contents/projects.js` returns `404` (file not yet in repo); `scripts/server.js` must reject non-local `Origin` headers with `403` and return `200` when `git status --porcelain projects.js` is empty (covered in Tasks 5 & 6).
- **Multi-step thumbnail fallback & URL hash Back/Forward:** Video thumbnails must step through `maxresdefault.jpg` → `sddefault.jpg` → `hqdefault.jpg` on both `naturalWidth <= 120` and `error`; `hashchange` must update the active tab without history loops (covered in Tasks 2 & 3).

---

### Task 1: Extract Shared Catalog into `projects.js` and Wire Fallback Loading

**Files:**
- Create: `projects.js`
- Modify: `index.html:1080-1273`, `index.html:1400-1413`, `admin.html:954-1195`, `admin.html:1786-1792`
- Test: `scripts/test-portfolio.js`

**Interfaces:**
- Produces: `window.DEFAULT_PROJECTS` array in `projects.js` (21 project objects; omits `visible: true`, preserves `visible: false`), and shared fallback pattern in `index.html` (`getProjectsList()`) and `admin.html` (`loadProjects()`).

- [ ] **Step 1: Replace legacy fixed-ID assertions in `scripts/test-portfolio.js` with `projects.js` schema & fallback tests**

Write tests in `scripts/test-portfolio.js` using Node's `assert` + `vm` that:
1. Check `projects.js` exists and executes in a `{ window: {} }` `vm` context, producing `Array.isArray(ctx.window.DEFAULT_PROJECTS)` with `length >= 1`.
2. Add a small `createDomStub()` helper in `scripts/test-portfolio.js` (returning mock elements with `addEventListener`, `querySelector`, `querySelectorAll`, `classList`, `style`, `value`, `appendChild`, `setAttribute`) so `index.html` and `admin.html` inline `<script>` blocks can execute safely in Node `vm` without `jsdom`.
3. Validate every entry in `DEFAULT_PROJECTS`: `type` in `['video', 'design']`, `category` in `['video', 'design', 'ia']`, non-empty `title`, `ratio` in `['ratio-9-16', 'ratio-16-9', 'ratio-4-3', 'ratio-3-2']`, `Array.isArray(tags)`, non-empty `id` when `type === 'video'`, non-empty `image` when `type === 'design'`.
4. Assert both `index.html` and `admin.html` contain `<script src="projects.js"></script>`, do NOT declare `PROJECTS: [` or `const DEFAULT_PROJECTS = [`, and read `window.DEFAULT_PROJECTS`.
5. Run `getProjectsList()` from `index.html` inside `vm` to verify fallback to `window.DEFAULT_PROJECTS` when `localStorage.getItem("portfolio_projects")` returns `"[]"` or `"not-json"`.

- [ ] **Step 2: Run test script to verify it fails before extraction**

Run: `node scripts/test-portfolio.js`
Expected: FAIL (`projects.js` not found).

- [ ] **Step 3: Create `projects.js` and update `index.html` and `admin.html`**

1. Create `projects.js` exporting `window.DEFAULT_PROJECTS = [ ... ];` with the exact 21 items currently in `index.html:1087-1272`.
2. In `index.html`: add `<script src="projects.js"></script>` directly before the main inline `<script>`, remove `PROJECTS: [...]` from `CONFIG`, and update `getProjectsList()` (`index.html:1400-1413`) to fall back to `(window.DEFAULT_PROJECTS || []).filter((item) => item.visible !== false)`.
3. In `admin.html`: add `<script src="projects.js"></script>` directly before the main inline `<script>`, remove `const DEFAULT_PROJECTS = [...]`, and update `loadProjects()` and `#btn-reset` handler to clone `window.DEFAULT_PROJECTS || []`.

- [ ] **Step 4: Run test script to verify it passes**

Run: `node scripts/test-portfolio.js`
Expected: PASS on all Task 1 checks.

- [ ] **Step 5: Commit**

```bash
git add projects.js index.html admin.html scripts/test-portfolio.js
git commit -m "refactor: extract shared project catalog into projects.js"
```

---

### Task 2: Public Hero CTA, Clean Footer, Hash Sync & Subcategory Filtering in `index.html`

**Files:**
- Modify: `index.html` (CSS `.hero-strip`, `.ratio-21-9`/`.ratio-16-10`/`.inline-*` removal, HTML `<main>` Hero + `<footer>`, JS `WHATSAPP_MESSAGE`, `initContacts`, `renderSubNav`, `setCategory`, `initNavigation`, dead inline-video code removal)
- Test: `scripts/test-portfolio.js`

**Interfaces:**
- Consumes: `window.DEFAULT_PROJECTS`, `CONFIG.WHATSAPP_NUMBER`, `CONFIG.WHATSAPP_MESSAGE`.
- Produces: `.hero-strip` (`<h1 class="hero-title">` + `#hero-whatsapp`), `SUBCATEGORIES` label map with `>= 2` threshold filtering in `renderSubNav()`, `setCategory(category, updateHash = true)` + `hashchange` listener.

- [ ] **Step 1: Add failing tests for Hero, Footer, Hash Sync, Subcategories & Dead Code Removal in `scripts/test-portfolio.js`**

Add checks in `scripts/test-portfolio.js`:
1. `index.html` contains `class="hero-strip"`, `<h1 class="hero-title"`, `id="hero-whatsapp"`, and updated `WHATSAPP_MESSAGE` (`"Olá Alan, vi seu portfólio e gostaria de conversar sobre um projeto."`, not `"projeto de edição"`).
2. `index.html` `<footer>` does NOT contain `href="admin.html"` and does not use `#555`/`#666` low-contrast inline colors (uses `#999999` / `var(--muted)`).
3. `index.html` does NOT contain `playInlineVideo`, `stopCurrentInlineVideo`, `.inline-video-iframe`, `.ratio-21-9`, or `.ratio-16-10`.
4. `index.html` contains `hashchange` listener and updates `location.hash` / `history.replaceState` in `setCategory`.
5. Run `renderSubNav` / filter helper in `vm` context for `video`, `design`, and `ia` against `projects.js`: `video` renders `todos`, `reels`, `social media`, `fitness`; `design` and `ia` hide `#sub-nav` because `< 2` tags reach the `>= 2` threshold (and `design`/`ia` own-name tags are excluded).

- [ ] **Step 2: Run test script to verify new assertions fail**

Run: `node scripts/test-portfolio.js`
Expected: FAIL on missing `.hero-strip` / footer link / `playInlineVideo` / `hashchange`.

- [ ] **Step 3: Implement Hero, Footer, Subcategories, Hash Sync & Dead Code Cleanup in `index.html`**

1. Remove dead CSS (`.masonry-item.is-playing*`, `.inline-video-iframe`, `.inline-close-btn*`, `.ratio-21-9`, `.ratio-16-10`) and dead JS (`currentPlayingCard`, `stopCurrentInlineVideo`, `playInlineVideo`, and calls to `stopCurrentInlineVideo()`).
2. Add minimal `.hero-strip` CSS (single horizontal flex row, wrapping cleanly on mobile, bottom border/spacing before `#gallery-grid`, hidden when `.is-hidden`).
3. Insert `<section id="hero-strip" class="hero-strip">` at top of `<main>` with `<h1 class="hero-title">Edição de vídeo, design e soluções com IA para marcas e criadores.</h1>` and `<a id="hero-whatsapp" class="hero-cta" href="#" target="_blank" rel="noopener noreferrer">Orçamento no WhatsApp</a>`. Wire `#hero-whatsapp` in `initContacts()`.
4. Change `about-hero`/`about-grid`/`about-bottom` headings in `#about-section` from `<h3>` to `<h2>` for clean heading hierarchy (`<h1>` -> `<h2>`), and hide `#hero-strip` when `state.activeCategory === "sobre"`.
5. Replace `<footer>` markup with `<footer class="site-footer"><span>Alan Oliveira</span></footer>` styled with `color: var(--muted);` (`#999999`).
6. Keep `SUBCATEGORIES` as curated tag lists/labels per category (excluding self-tags like `design` under `design`, `ia` under `ia`), and in `renderSubNav()` count visible items in `state.activeCategory` per tag, keeping only tags with `count >= 2`; if fewer than 2 non-`all` filters qualify, hide `#sub-nav`. Reset `state.activeSubFilter = "all"` if active subfilter disappears.
7. Update `setCategory(category, updateHash = true)`: when `updateHash` is true and `window.location.hash !== targetHash`, call `history.pushState(null, "", targetHash)` (or `replaceState` for initial default); add `window.addEventListener("hashchange", ...)` reading `location.hash` and calling `setCategory(tab, false)`.

- [ ] **Step 4: Run test script to verify it passes**

Run: `node scripts/test-portfolio.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html scripts/test-portfolio.js
git commit -m "feat: add home hero CTA, clean footer, hash sync, and smart subfilters"
```

---

### Task 3: JS Column Masonry, Touch Titles, XSS Escaping & Thumbnail Fallbacks in `index.html`

**Files:**
- Modify: `index.html` (CSS `.masonry-grid`, `.masonry-col`, `.has-media-error`, `@media (hover: none), (max-width: 768px)`, JS `escapeHtml`, `isSafeImageUrl`, `getColumnCount`, `getRatioWeight`, `renderGallery`, `attachThumbFallback`, `resize` listener)
- Test: `scripts/test-portfolio.js`

**Interfaces:**
- Produces: `escapeHtml(str)`, `isSafeImageUrl(url)`, `getColumnCount(width)`, `getRatioWeight(item)`, `attachThumbFallback(img, card, item)`, `renderGallery()`.

- [ ] **Step 1: Add failing unit tests in `scripts/test-portfolio.js` for safety helpers, masonry column distribution, and thumbnail fallbacks**

Add `vm` tests in `scripts/test-portfolio.js` verifying:
1. `escapeHtml('Teste "Aspas" <img onerror=alert(1)>')` returns `'Teste &quot;Aspas&quot; &lt;img onerror=alert(1)&gt;'`.
2. `isSafeImageUrl('https://example.com/a.jpg') === true`, `isSafeImageUrl('assets/foto.jpg') === true`, `isSafeImageUrl('javascript:alert(1)') === false`, `isSafeImageUrl('data:text/html,...') === false`.
3. `getRatioWeight` returns `16 / 9` for `ratio-9-16`, `9 / 16` for `ratio-16-9`, `3 / 4` for `ratio-4-3`, `2 / 3` for `ratio-3-2`.
4. Distributing the first 4 items across 4 columns places items `0..3` at the top of columns `0..3` respectively, and item `4` into the shortest column (`16:9` column before `9:16` column).
5. `attachThumbFallback` steps `maxresdefault.jpg` → `sddefault.jpg` → `hqdefault.jpg` on `load` (`naturalWidth <= 120`) followed by `error`, and sets `card.classList.add('has-media-error')` on broken `design` image `error`.
6. CSS includes `@media (hover: none), (max-width: 768px)` making `.masonry-overlay` visible (`opacity: 1`).

- [ ] **Step 2: Run test script to verify new assertions fail**

Run: `node scripts/test-portfolio.js`
Expected: FAIL (`escapeHtml is not defined`, etc.).

- [ ] **Step 3: Implement JS Column Masonry, Mobile Visibility, Safe Helpers & Fallbacks in `index.html`**

1. Update `.masonry-grid` CSS to `display: flex; align-items: flex-start; gap: var(--gap);` (matching gap overrides at `900px`/`768px`/`480px`), add `.masonry-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--gap); }`, `.masonry-empty`, `.has-media-error`, and `@media (hover: none), (max-width: 768px)` rules showing `.masonry-overlay { opacity: 1; }` and `.play-indicator { opacity: 0.8; transform: translate(-50%, -50%) scale(0.95); }`. Remove `image-rendering: -webkit-optimize-contrast;`.
2. Implement `escapeHtml(str)`, `isSafeImageUrl(url)`, `getColumnCount(width = window.innerWidth)`, `getRatioWeight(item)`, and `attachThumbFallback(img, card, item)`.
3. Update `renderGallery()`:
   - If `items.length === 0`, render `.masonry-empty` ("Nenhum projeto encontrado nesta categoria.").
   - Create `colCount` `.masonry-col` elements with `colHeights = new Array(colCount).fill(0)`.
   - Build each `.masonry-item` using safe DOM APIs or `escapeHtml` + `isSafeImageUrl`, attach `attachThumbFallback`, find `minIndex` in `colHeights`, append card to `cols[minIndex]`, and add `getRatioWeight(item) + 0.08` to `colHeights[minIndex]`.
4. Add a debounced `window.addEventListener("resize", ...)` listener that re-renders `renderGallery()` only when `state.activeCategory !== "sobre"` and `getColumnCount() !== lastColumnCount`.

- [ ] **Step 4: Run test script to verify it passes**

Run: `node scripts/test-portfolio.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html scripts/test-portfolio.js
git commit -m "fix: implement shortest-column masonry, touch titles, XSS escaping, and thumb fallback chain"
```

---

### Task 4: Upgrade Lightbox Controls, Caption & Keyboard Focus Trap in `index.html`

**Files:**
- Modify: `index.html` (CSS `.lightbox-caption`, HTML `#lightbox-caption`, JS `renderLightboxContent`, `openLightbox`, `closeLightbox`, `initLightbox`)
- Test: `scripts/test-portfolio.js`

**Interfaces:**
- Consumes: `escapeHtml(str)`, `isSafeImageUrl(url)` from Task 3.
- Produces: `#lightbox-caption`, `controls=1` YouTube embed URL, `lastFocusedElement` focus save/restore and modal `Tab` trap.

- [ ] **Step 1: Add failing assertions for Lightbox in `scripts/test-portfolio.js`**

Add tests checking:
1. `index.html` contains `id="lightbox-caption"` inside `.lightbox-stage`.
2. `renderLightboxContent` builds embed URL with `controls=1` and without `controls=0` or `disablekb=1`.
3. `renderLightboxContent` sets `#lightbox-caption` text safely via `textContent` and escapes/validates media URLs.
4. `openLightbox` / `closeLightbox` store `lastFocusedElement`, move focus into `#lightbox-close`, trap `Tab` inside `#lightbox`, and restore focus on close.

- [ ] **Step 2: Run test script to verify it fails**

Run: `node scripts/test-portfolio.js`
Expected: FAIL.

- [ ] **Step 3: Implement Lightbox updates in `index.html`**

1. Add `<div id="lightbox-caption" class="lightbox-caption"></div>` inside `.lightbox-stage` below `<div id="lightbox-content"></div>` with clean centered muted/white styling.
2. In `renderLightboxContent()`: update `embedUrl` to `autoplay=1&controls=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`, validate `item.image` via `isSafeImageUrl` for images, escape `item.title` on `iframe`/`img` attributes, and set `lightboxCaption.textContent = \`${item.title} • ${categoryLabel}\``.
3. Track `let lastFocusedElement = null;`: on `openLightbox`, store `document.activeElement` and focus `#lightbox-close`; on `Tab` while `#lightbox.is-open`, cycle focus among `#lightbox-close`, `#lightbox-prev`, `#lightbox-next`; on `closeLightbox` completion, return focus to `lastFocusedElement`.

- [ ] **Step 4: Run test script to verify it passes**

Run: `node scripts/test-portfolio.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html scripts/test-portfolio.js
git commit -m "feat: add lightbox controls, caption, and keyboard focus management"
```

---

### Task 5: Fix `admin.html` Media Type/Aspect Bugs, XSS Escaping, Drag Polish & `projects.js` GitHub Sync

**Files:**
- Modify: `admin.html` (Modal form `#input-type` & `#input-aspect`, GitHub modal hint, JS `escapeHtml`, `isSafeImageUrl`, `buildProjectPayload`, `renderCards`, `dragleave`, `openEditModal`, `openCodeModal`, `pushToGitHubAPI`)
- Test: `scripts/test-portfolio.js`

**Interfaces:**
- Consumes: `window.DEFAULT_PROJECTS` from `projects.js`.
- Produces: `escapeHtml(str)`, `isSafeImageUrl(url)`, `buildProjectPayload(fields)` decoupling `type` (`video`/`design`) from `category` (`video`/`ia`/`design`) and preserving `ratio-4-3`/`ratio-3-2`, `pushToGitHubAPI(token)` committing `projects.js`.

- [ ] **Step 1: Add failing tests for `admin.html` fixes in `scripts/test-portfolio.js`**

Add tests in `scripts/test-portfolio.js`:
1. Assert `admin.html` contains `id="input-type"` (`video` and `design` options), `4:3` and `3:2` options in `#input-aspect`, `escapeHtml`, `relatedTarget` check in `dragleave`, and targets `/contents/projects.js` in `pushToGitHubAPI` (without regex patching `index.html` or `admin.html`).
2. Extract/run `buildProjectPayload` in `vm`:
   - Input `{ type: 'design', category: 'ia', rawSource: 'https://images.unsplash.com/photo-1', title: 'IA Render', aspect: '4:3', tags: ['ia', 'renders'], visible: true }` returns `{ type: 'design', category: 'ia', title: 'IA Render', aspect: '4:3', ratio: 'ratio-4-3', image: 'https://images.unsplash.com/photo-1', tags: ['ia', 'renders'], visible: true }` with `id === undefined`.
   - Input `{ type: 'video', category: 'ia', rawSource: 'https://youtube.com/shorts/ZgsA0pQszPk', title: 'IA Video', aspect: '9:16', tags: ['ia'], visible: true }` returns `id: 'ZgsA0pQszPk'`, `ratio: 'ratio-9-16'`, and `image === undefined`.
3. Assert `pushToGitHubAPI` code handles `res.status === 404` when `projects.js` does not exist yet on GitHub.

- [ ] **Step 2: Run test script to verify it fails**

Run: `node scripts/test-portfolio.js`
Expected: FAIL.

- [ ] **Step 3: Implement `admin.html` fixes**

1. Add `<select id="input-type">` (`video` / `design`) to `#item-form` and add `4:3` / `3:2` options to `#input-aspect`. Update input label/placeholder/preview dynamically when `#input-type` changes (`updateMediaInputUI()` + `updateThumbPreview()`), and call `updateMediaInputUI()` inside both `openAddModal()` and `openEditModal()`.
2. Implement `escapeHtml`, `isSafeImageUrl`, and `buildProjectPayload` in `admin.html`: strip stale `id` when `type === "design"` and strip stale `image` when `type === "video"`; map `aspect` to `ratio` across all 4 ratios (`9:16`, `16:9`, `4:3`, `3:2`). Update `openEditModal` to populate `inputType` and infer `4:3`/`3:2`/`16:9`/`9:16` properly.
3. Update `renderCards()` to escape `title`, `thumbUrl`, `category`, and `tags`, and display accurate ratio badge (`9:16`, `16:9`, `4:3`, `3:2`). Fix `dragleave` using `if (e.relatedTarget && card.contains(e.relatedTarget)) return;`.
4. Update `openCodeModal()` to output `window.DEFAULT_PROJECTS = ${JSON.stringify(cleanArray, null, 2)};` referencing `projects.js`, update `pushToGitHubAPI(token)` to GET/PUT `https://api.github.com/repos/${repo}/contents/projects.js` (handling `404` without `sha`), and add Fine-grained PAT note in `#github-modal`.

- [ ] **Step 4: Run test script to verify it passes**

Run: `node scripts/test-portfolio.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add admin.html scripts/test-portfolio.js
git commit -m "fix: decouple admin media type from category, fix ratios, XSS, and projects.js sync"
```

---

### Task 6: Harden `scripts/server.js` Localhost Binding, Origin Check & Clean-Diff Commit

**Files:**
- Modify: `scripts/server.js`
- Test: `scripts/test-portfolio.js`

**Interfaces:**
- Produces: `isAllowedOrigin(origin)`, `validateProjectsPayload(projects)`, `formatProjectsFile(projects)`, `resolveSafeStaticPath(reqPath)` exported from `scripts/server.js`, with `if (require.main === module) server.listen(PORT, '127.0.0.1', ...)`.

- [ ] **Step 1: Add failing unit tests for `scripts/server.js` in `scripts/test-portfolio.js`**

Add tests in `scripts/test-portfolio.js` that `require('./server.js')` (without starting the HTTP server) and assert:
1. `isAllowedOrigin(undefined) === true`, `isAllowedOrigin('http://localhost:8089') === true`, `isAllowedOrigin('http://127.0.0.1:8089') === true`, `isAllowedOrigin('https://evil.example') === false`.
2. `validateProjectsPayload([]) === false`, `validateProjectsPayload([{ title: '' }]) === false`, `validateProjectsPayload([{ type: 'design', category: 'ia', title: 'Ok', image: 'assets/a.jpg' }]) === true`.
3. `formatProjectsFile(projects)` starts with `'window.DEFAULT_PROJECTS = '` and strips `visible: true`.
4. `resolveSafeStaticPath('/../secret.txt')` stays inside `ROOT_DIR` or returns `null` when escaping.
5. `scripts/server.js` binds `'127.0.0.1'`, checks `git status --porcelain projects.js`, and no longer contains `Access-Control-Allow-Origin: *` or regex writes into `index.html`/`admin.html`.

- [ ] **Step 2: Run test script to verify it fails**

Run: `node scripts/test-portfolio.js`
Expected: FAIL (`isAllowedOrigin is not a function`, etc.).

- [ ] **Step 3: Implement `scripts/server.js` hardening**

1. Extract `isAllowedOrigin(origin)`, `validateProjectsPayload(projects)`, `formatProjectsFile(projects)`, and `resolveSafeStaticPath(reqPath)`.
2. Reject disallowed `Origin` headers on CORS / `/api/save-git` with `403`, and set `Access-Control-Allow-Origin` only when `isAllowedOrigin(origin)` matches a local origin (adding `Vary: Origin`).
3. Validate `payload.projects` with `validateProjectsPayload`, write `projects.js` directly with `formatProjectsFile(projects)`, check `git status --porcelain projects.js`, and if empty return `200` `{ ok: true, message: 'Nenhuma alteração pendente para enviar.' }`; otherwise run `git add projects.js`, `git commit`, and `git push origin main`.
4. Guard `if (require.main === module) { server.listen(PORT, '127.0.0.1', ...); }` and export the pure helpers for tests.

- [ ] **Step 4: Run full validation suite**

Run: `node scripts/test-portfolio.js`
Expected: PASS (`TODOS OS TESTES PASSARAM COM SUCESSO!`).

- [ ] **Step 5: Commit**

```bash
git add scripts/server.js scripts/test-portfolio.js
git commit -m "fix: bind local admin server to 127.0.0.1, validate origins, and write projects.js directly"
```
