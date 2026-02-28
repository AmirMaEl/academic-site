# Copilot Instructions

## Project Snapshot
- Static academic site served directly from the repo root; no build system or bundler. HTML pages (index.html, paper-acceptance-game.html, etc.) load global CSS (style.css) plus focused vanilla JS under scripts/.
- Keep assets ASCII and lightweight; JS is plain IIFE modules that rely on `data-` hooks instead of frameworks.

## Layout & Styling
- All components share style.css. Class names follow a BEM-ish pattern (`hero__card`, `iclr-game__button`). Extend existing blocks instead of inventing new global resets.
- Reuse CSS custom properties defined in `:root` for spacing, colors, and radii. New utilities should align with these tokens so dark/light tweaks remain consistent.

## Publications Flow
- `scripts/publications.js` hydrates `[data-publications-list]` from inline JSON (`#publications-data`) when available, otherwise fetches `data/publications.json`. When editing markup, retain the data attribute structure.
- `data/publications.json` is generated via `python scripts/update_publications.py`; the script scrapes Google Scholar, applies RESOURCE_OVERRIDES, then writes the payload. Run it before committing publication changes and keep the JSON UTF-8 with `generatedAt` metadata.
- When serving the site via `file://`, fetches fail; use `python -m http.server 8000` (or any static server) so XHRs succeed.

## ICLR Review Game
- `scripts/iclr-game.js` reads the raw TSV `iclr_papers.txt` in-browser. The header row must contain `id,title,abstract,url,ratings_avg`. If you alter the dataset schema, update `parseDataset` and `extractArxivId` accordingly.
- Game UI lives both inside `[data-iclr-game]` on index.html and the dedicated paper-acceptance-game.html wrapper. Elements are located via `data-game-*` attributes; keep these names stable when tweaking markup.
- The script enforces five-paper rounds, clamps guesses to 1–10, and stores summaries in `state.history`. Any new features (filters, difficulty, etc.) should extend the state object rather than introducing globals.

## Accessibility & Content Patterns
- Sections expose IDs for skip links and navigation (About, News, Publications, etc.). When inserting new blocks, follow the existing `section.section` structure with `.section__header` and `.section__body` for consistency.
- All external links should include `rel="noopener noreferrer"` (see publications.js cards and hero badges). Match that pattern for new anchors created in JS.

## Local Development Tips
- No npm scripts; editing is immediate. Use a static server plus live reload tooling of your choice.
- Keep JavaScript compatible with evergreen browsers but avoid build-time transforms; the site is intended to run as-is when opened from the filesystem or GitHub Pages.
