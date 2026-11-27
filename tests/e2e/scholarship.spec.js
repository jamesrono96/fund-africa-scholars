import { test, expect } from "@playwright/test";

const API = "https://fund-africa-scholars-api.jamesrono96.workers.dev";

const verifiedScholarship = {
  scholarship: {
    id: "verified-test-1",
    title: "African Excellence Graduate Scholarship",
    provider: "Example International University",
    destination_country: "Canada",
    study_levels: JSON.stringify(["Masters", "PhD"]),
    subject_areas: JSON.stringify(["Computer Science", "Engineering"]),
    application_deadline: "2027-04-30",
    funding_type: "fully_funded",
    description: "A test opportunity for postgraduate students.",
    eligibility_summary: "Applicants must meet the university admission requirements.",
    funding_details: "Tuition, accommodation and living allowance.",
    official_url: "https://university.example/scholarships/african-excellence",
    source_checked_at: "2026-11-27"
  }
};

test("scholarship detail renders verified information and links only to its HTTPS source", async ({ page }) => {
  await page.route(`${API}/api/scholarships/verified-test-1`, route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(verifiedScholarship)
    })
  );

  await page.goto("/scholarship.html?id=verified-test-1");

  await expect(page.getByRole("heading", { name: "African Excellence Graduate Scholarship" })).toBeVisible();
  await expect(page.locator("#provider")).toHaveText("Example International University");
  await expect(page.locator("#eligibility")).toContainText("admission requirements");
  await expect(page.locator("#funding")).toContainText("living allowance");
  await expect(page.locator("#source")).toContainText("2026-11-27");
  await expect(page.locator("#official-link")).toHaveAttribute(
    "href",
    "https://university.example/scholarships/african-excellence"
  );
  await expect(page.locator("#official-link")).toHaveAttribute("rel", "noopener noreferrer");
});

test("scholarship detail gives a helpful message when no identifier is supplied", async ({ page }) => {
  await page.goto("/scholarship.html");

  await expect(page.getByRole("heading", { name: "Scholarship not found" })).toBeVisible();
  await expect(page.locator("#status")).toContainText("No scholarship identifier was provided");
  await expect(page.locator("#official-link")).toBeHidden();
});

test("scholarship detail layout fits a narrow mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(`${API}/api/scholarships/verified-test-1`, route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(verifiedScholarship)
    })
  );

  await page.goto("/scholarship.html?id=verified-test-1");
  await expect(page.getByRole("heading", { name: "African Excellence Graduate Scholarship" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  await expect(page.locator("#save-button")).toBeVisible();
  await expect(page.locator("#track-button")).toBeVisible();
});

test("scholarship detail hides a non-HTTPS provider link", async ({ page }) => {
  const unsafe = structuredClone(verifiedScholarship);
  unsafe.scholarship.official_url = "javascript:alert(1)";
  await page.route(`${API}/api/scholarships/verified-test-1`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(unsafe) })
  );

  await page.goto("/scholarship.html?id=verified-test-1");
  await expect(page.getByRole("heading", { name: "African Excellence Graduate Scholarship" })).toBeVisible();
  await expect(page.locator("#official-link")).toBeHidden();
});

test("scholarship detail explains when the scholarship API is unavailable", async ({ page }) => {
  await page.route(`${API}/api/scholarships/verified-test-1`, route =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Scholarship service temporarily unavailable." })
    })
  );

  await page.goto("/scholarship.html?id=verified-test-1");
  await expect(page.getByRole("heading", { name: "Scholarship unavailable" })).toBeVisible();
  await expect(page.locator("#status")).toContainText("temporarily unavailable");
});
