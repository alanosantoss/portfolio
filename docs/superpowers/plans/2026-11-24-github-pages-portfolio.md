# GitHub Pages Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure and deploy Alan Oliveira's portfolio to GitHub Pages with 4 YouTube showcase videos and an in-site cinema lightbox player.

**Architecture:** A static, single-page website (`index.html`) using semantic HTML5, CSS3, and vanilla JavaScript. The YouTube videos are loaded with YouTube thumbnail URLs (`maxresdefault.jpg` with `hqdefault.jpg` fallback) and played inside a centered 16:9 lightbox modal with fullscreen options.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES6+), Git, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-24-github-pages-portfolio-design.md`

## Global Constraints
- Target platform: GitHub Pages (root directory serving `index.html`).
- Zero build tools or runtime dependencies (vanilla browser-native).
- Preserve existing dark editorial typography and masonry layout.
- Embed YouTube videos: `8lmrTdA1EsU`, `0GgqcRnrNhs`, `Gau-fbkBrrw`, `R1g2IAmim6A`.

## Review Focus
- Browser blocking of YouTube oEmbed or iframe autoplay: verify fallback titles and thumbnails display properly.
- Missing `maxresdefault.jpg` on YouTube: verify automatic fallback to `hqdefault.jpg`.
- Mobile viewport responsive layout: verify masonry grid adapts and lightbox modal fits without horizontal scrolling.
- Lightbox controls: verify Esc key, backdrop click, and close button dismiss the modal and stop playback.
- File naming for GitHub Pages: ensure `index.html` is the primary entry point.

---

### Task 1: Generate `index.html` with Configured 4 YouTube Videos

**Files:**
- Create: `index.html`
- Source: `portf_lio_alan_oliveira.html`

**Interfaces:**
- Consumes: YouTube video IDs `8lmrTdA1EsU`, `0GgqcRnrNhs`, `Gau-fbkBrrw`, `R1g2IAmim6A`
- Produces: `index.html` configured for GitHub Pages with in-site cinema lightbox.

- [ ] **Step 1: Create `index.html` with direct YouTube video configuration**
Configure `CONFIG.VIDEOS = [ { id: "8lmrTdA1EsU", title: "Vídeo 1" }, { id: "0GgqcRnrNhs", title: "Vídeo 2" }, { id: "Gau-fbkBrrw", title: "Vídeo 3" }, { id: "R1g2IAmim6A", title: "Vídeo 4" } ]` and ensure video items load directly without requiring an external playlist API call.

- [ ] **Step 2: Verify `index.html` syntax and video configuration**
Check that `index.html` contains the 4 IDs and correct iframe embed format `https://www.youtube.com/embed/{id}?autoplay=1&rel=0&modestbranding=1`.

---

### Task 2: Automated Validation & Smoke Tests

**Files:**
- Create: `scripts/test-portfolio.js`

**Interfaces:**
- Consumes: `index.html`
- Produces: Test results verifying required elements, 4 video IDs, lightbox markup, and image fallback listeners.

- [ ] **Step 1: Write validation test script `scripts/test-portfolio.js`**
Write a self-contained Node.js script asserting that `index.html` exists, contains all 4 video IDs, contains the lightbox container, and valid meta tags.

- [ ] **Step 2: Run test script to verify assertions pass**
Run: `node scripts/test-portfolio.js`
Expected: Output showing all portfolio assertions PASS.

---

### Task 3: Git Initialization and GitHub Pages Instructions

**Files:**
- Modify/Create: `.gitignore`, `README.md`

**Interfaces:**
- Consumes: `index.html`, `README.md`
- Produces: Initialized Git repository on branch `main` with initial commit and clear instructions to publish to GitHub Pages.

- [ ] **Step 1: Create `.gitignore` and `README.md`**
Add `.gitignore` ignoring temp files and `README.md` explaining how to enable GitHub Pages (Settings -> Pages -> Deploy from branch `main` / root).

- [ ] **Step 2: Initialize Git and make initial commit**
Run: `git init -b main && git add . && git commit -m "feat: setup portfolio for GitHub Pages with YouTube lightbox"`
Expected: Clean working tree on branch `main`.
