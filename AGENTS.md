# Planning

* Save all plans (with descriptive names) to documentation/plans.

# Use tsgo instead of tsc
* Use typescript native (tsgo) instead of tsc.

# Package Manager And Commands

* Use pnpm

# Project Index

* The project index (an overview of the project) lives in documentation/ProjectIndex.md

# Code Style

* We prefer `undefined` over `null` everywhere in the codebase except when interfacing with external APIs.
* Code should be in TypeScript and HTML
* Run `pnpm format` before committing (prettier, no semicolons, double quotes)
* Strict TypeScript: `strictNullChecks` is enabled — handle undefined/null explicitly
* Max 80 char line width, 2-space indentation
* See `documentation/codeStyle.md` for standard practices.

# Sprite generation

* Generate sprites with the mcp-image mcp server.
* Double check that sprites are correct

# Import Conventions

* Use relative paths — no barrel exports or path aliases
* Use `import type` for type-only imports
* Order: pixi.js → core → physics → rendering → entities → local

# Commands

* `pnpm dev` — start esbuild dev server
* `pnpm build` — typecheck and build for production
* `pnpm typecheck` — run `npx tsgo --noEmit`
* `pnpm format` — run Prettier
* `pnpm playwright` — run Playwright tests (in `tests/playwright/`)

# Code Conventions

* Read contents of 'documentation/Conventions.md'
