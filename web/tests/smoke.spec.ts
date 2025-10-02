import { expect, test } from "@playwright/test"

test.describe("Smoke", () => {
  test("home redirects to overview", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/overview$/)
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible()
  })

  test("admin helper renders", async ({ page }) => {
    await page.goto("/admin")
    await expect(page.getByRole("heading", { name: /Admin \/ QA/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Run full pipeline/i })).toBeVisible()
  })
})
