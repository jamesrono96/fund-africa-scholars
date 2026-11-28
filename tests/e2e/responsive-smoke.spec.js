import { test, expect } from "@playwright/test";

const publicPages = [
  { path: "/", heading: "Make your global education dream a reality." },
  { path: "/directory.html", heading: "Find funding for your next chapter." },
  { path: "/account.html", heading: "Your scholarship journey starts here." },
  { path: "/dashboard.html", heading: "Your scholarship dashboard" },
  { path: "/admin.html", heading: "Scholarship administration" }
];

test.describe("responsive page smoke checks", () => {
  for (const item of publicPages) {
    test(`${item.path} renders at mobile width without horizontal page overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(item.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, "page should not require horizontal scrolling").toBeLessThanOrEqual(1);
    });
  }

  test("account form exposes labelled sign-in fields and accessible status", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/account.html", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Email address").first()).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.locator("#auth-message")).toHaveAttribute("aria-live", "polite");
  });

  test("scholarship directory exposes labelled search filters and live status", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/directory.html", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Keyword or subject")).toBeVisible();
    await expect(page.getByLabel("Destination country")).toBeVisible();
    await expect(page.locator("#status")).toHaveAttribute("aria-live", "polite");
  });
});
