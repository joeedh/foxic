import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

test("loads level 1 and takes screenshot", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" })

  // Wait for canvas (appended after assets load and renderer initializes)
  const canvas = page.locator("canvas")
  await expect(canvas).toBeVisible({ timeout: 15000 })

  // Let the title scene render
  await page.waitForTimeout(1000)

  // Hold Space long enough for a physics tick to detect it (game runs at 60 FPS)
  await page.keyboard.down("Space")
  await page.waitForTimeout(200)
  await page.keyboard.up("Space")

  // Wait for GameScene to load and render
  await page.waitForTimeout(2000)

  // Save screenshot to a known location
  const screenshotDir = path.join("tests", "playwright", "test-results", "screenshots")
  fs.mkdirSync(screenshotDir, { recursive: true })

  await canvas.screenshot({
    path: path.join(screenshotDir, "level-load.png"),
  })
})
