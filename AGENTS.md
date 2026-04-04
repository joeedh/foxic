# Package Manager
* Use pnpm

# Project Index

* The project index (an overview of the project) lives in documentation/ProjectIndex.md

# Code Style

* Code should be in TypeScript and HTML
* Run `pnpm format` before committing (prettier, no semicolons, double quotes)
* Strict TypeScript: `strictNullChecks` is enabled — handle nulls explicitly
* Max 80 char line width, 2-space indentation

# Sprite generation

* Generate sprites with the mcp-image mcp server.
* Double check that sprites are correct

# Import Conventions

* Use relative paths — no barrel exports or path aliases
* Use `import type` for type-only imports
* Order: pixi.js → core → physics → rendering → entities → local

# Code Conventions

* Read contents of 'documentation/Conventions.md'
