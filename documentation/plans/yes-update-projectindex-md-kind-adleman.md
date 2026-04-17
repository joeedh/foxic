# Plan: Update ProjectIndex.md — Remove Stale Vite References

## Context

Vite was replaced with a custom esbuild server wrapper (`packages/esbuild-serve/serv.js`) as of 2026-04-17. `ProjectIndex.md` still describes the project as using Vite and lists stale commands and dependencies. This plan corrects those inaccuracies so the documentation reflects the actual build tooling.

## File to Edit

`documentation/ProjectIndex.md`

## Changes

### 1. Overview (line 5)
**Before:**
> 2D Sonic-style platformer built with TypeScript, a custom WebGL2 renderer, and Vite.

**After:**
> 2D Sonic-style platformer built with TypeScript, a custom WebGL2 renderer, and esbuild.

---

### 2. Commands section (lines 131–140)

The actual scripts (from `package.json` and `src/package.json`):

- `pnpm dev` → runs `node .../esbuild-serve/serv.js serv` — serves `public/` at **localhost:5723** (default port in `serv.js`), no HMR
- `pnpm build` → runs `npx tsgo` (TypeScript native preview compiler, type-check only)
- `pnpm preview` → **does not exist** — remove it
- `pnpm format`, `pnpm typecheck`, `pnpm playwright` — unchanged

**Before:**
```bash
pnpm dev         # Dev server with HMR (localhost:5173)
pnpm build       # TypeScript check + Vite build
pnpm preview     # Preview built game
pnpm format      # Run Prettier on src/ and index.html
pnpm typecheck   # TypeScript check only (tsc --noEmit)
pnpm playwright  # Run Playwright E2E tests
```

**After:**
```bash
pnpm dev         # Dev server (localhost:5723, esbuild-serve)
pnpm build       # TypeScript check (tsgo --noEmit)
pnpm format      # Run Prettier on src/ and index.html
pnpm typecheck   # TypeScript check only (tsgo --noEmit)
pnpm playwright  # Run Playwright E2E tests
```

---

### 3. Dependencies (line 145)

**Before:**
> **Dev:** typescript v6.0.2, vite v8.0.3, prettier v3.8.1, playwright v1.59.1, mcp-image v0.10.0

**After:**
> **Dev:** typescript v6.0.2, esbuild v0.28.0, prettier v3.8.1, playwright v1.59.1, mcp-image v0.10.0

---

### 4. Architecture Highlights (line 149) — no change needed

The phrase "replacing pixi.js" is accurate historical context describing the renderer's origin. Leave as-is.

## Verification

After editing, grep `ProjectIndex.md` for `vite` (case-insensitive) — should return zero matches.
