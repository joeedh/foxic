# Playwright Setup Plan

## Context
Add a basic Playwright E2E test that loads the game, transitions past the title screen into Level 1, and saves a screenshot to a known location (`tests/playwright/test-results/screenshots/level-load.png`).

This first test should not expect the screenshot to match any snapshot.  It will be used to generate screenshots for testing and development purposes.

## Steps

### 1. Install dependencies
```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

### 2. Create `playwright.config.ts`
- testDir: `./tests/playwright`
- Single chromium project
- webServer: `pnpm dev` on port 5173 (reuseExistingServer in non-CI)

### 3. Create `tests/playwright/level-load.spec.ts`
- Navigate to `/`, wait for `networkidle`
- Wait for `<canvas>` to be visible (signals assets loaded + renderer initialized)
- Wait 1s, press Space (triggers `TitleScene` → `GameScene` via `justPressed(Action.Jump)`)
- Wait 2s for level to render
- Save screenshot to `tests/playwright/test-results/screenshots/level-load.png`

### 4. Update `package.json`
- Add script: `"playwright": "playwright test"`

## Key files
- `src/input.ts:15` — `Space: Action.Jump` mapping
- `src/scenes/TitleScene.ts:43` — `justPressed(Action.Jump)` → `onStart()`
- `src/main.ts` — init flow: loadAllAssets → create renderer → create scenes

## Screenshot location
`tests/playwright/test-results/screenshots/level-load.png` — deterministic, readable by Claude after test run.

## Verification
```bash
pnpm test:e2e
# Then check: tests/playwright/test-results/screenshots/level-load.png exists
```

## Notes
- Playwright's Chromium uses SwiftShader for WebGL by default — should work but may differ slightly from GPU rendering
- If canvas is blank, add `args: ['--use-gl=egl']` to chromium launch options
