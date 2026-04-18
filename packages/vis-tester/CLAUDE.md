# vis-tester

A reusable visual testing harness built on `path.ux`. It provides a minimal app shell — context, screen, editors, and file I/O — that downstream packages extend to build interactive test environments for rendering and geometry code.

## Structure

- `core/` — base classes: `AppState`, `AppContext`, `AppScreen`, `PropertiesBag`, file serialization
- `editors/` — `CanvasEditor` (WebGL/2D canvas panel), `MainMenuBar`, and editor utilities
- `assets/` — theme and icon enum
- `serv.mjs` — static file server with on-the-fly esbuild transpilation (default port 6001)
- `esbuilder.mjs` — esbuild wrapper invoked per-request by the server

## Commands

- `pnpm run serv` — start the dev server (`node serv.mjs [port]`)
- `pnpm typecheck` — `npx tsgo --noEmit`
- `pnpm format` — Prettier (no semicolons, double quotes)

## Key Conventions

- Inherit from `AppState` and pass concrete context/screen types as generics
- Register editors and tools in `core/register.ts` via `buildAPI`
- Use `path.ux` APIs (`UIBase`, `ToolStack`, `DataAPI`) — do not import DOM directly in editor code
- Prefer `undefined` over `null`; `strictNullChecks` is on
- Use relative imports; no barrel re-exports or path aliases
