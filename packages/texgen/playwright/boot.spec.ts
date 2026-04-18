import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"

test("texgen boots without console errors and renders all panes", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
  })
  page.on("pageerror", (err) => errors.push(err.message))

  await page.goto("/", { waitUntil: "networkidle" })

  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(500)

  const count = await page.locator("canvas").count()
  expect(count).toBeGreaterThanOrEqual(3)

  const dir = path.join("playwright", "test-results", "screenshots")
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, "boot.png"), fullPage: true })

  expect(errors, errors.join("\n")).toEqual([])
})
