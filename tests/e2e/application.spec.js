import { test, expect } from "@playwright/test";

const API = "https://fund-africa-scholars-api.jamesrono96.workers.dev";

test("account page switches tabs and signs in with a mocked API", async ({ page }) => {
  await page.route(`${API}/api/auth/me`, route =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Sign in required." }) })
  );
  await page.route(`${API}/api/auth/login`, async route => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.postDataJSON()).toMatchObject({ email: "student@example.test", password: "CorrectHorseBatteryStaple!" });
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ user: { id: "test-student", full_name: "Test Student", email: "student@example.test", country_of_residence: "Kenya" } })
    });
  });

  await page.goto("/account.html");
  await expect(page.getByRole("heading", { name: "Your scholarship journey starts here." })).toBeVisible();
  await page.getByRole("tab", { name: "Create account" }).click();
  await expect(page.locator("#register-form")).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator("#login-email").fill("student@example.test");
  await page.locator("#login-password").fill("CorrectHorseBatteryStaple!");
  await page.locator("#login-form button[type=submit]").click();

  await expect(page.locator("#profile-name")).toHaveText("Test Student");
  await expect(page.locator("#profile-email")).toHaveText("student@example.test");
  await expect(page.locator("#login-password")).toHaveValue("");
});

test("account page reports API connectivity failures", async ({ page }) => {
  await page.route(`${API}/api/auth/me`, route =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }) })
  );
  await page.goto("/account.html");
  await expect(page.locator("#auth-message")).toContainText("could not reach the account service");
});

test("directory displays an honest empty state and submits search filters", async ({ page }) => {
  let requestedUrl = "";
  await page.route(`${API}/api/scholarships**`, async route => {
    requestedUrl = route.request().url();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ scholarships: [], count: 0, limit: 20, offset: 0, has_more: false })
    });
  });
  await page.route(`${API}/api/student/recommendations`, route =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Sign in required." }) })
  );

  await page.goto("/directory.html");
  await expect(page.locator("#status")).toContainText("No published verified scholarships");
  await page.locator("#q").fill("computer science");
  await page.locator("#country").fill("Canada");
  await page.locator("#level").selectOption("Masters");
  await page.getByRole("button", { name: "Search scholarships" }).click();
  await expect.poll(() => requestedUrl).toContain("q=computer");
  expect(requestedUrl).toContain("country=Canada");
  expect(requestedUrl).toContain("level=Masters");
  await expect(page.locator("#results")).toContainText("No verified scholarships match");
});

test("student can register and sign out in the account interface", async ({ page }) => {
  await page.route(`${API}/api/auth/me`, route =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Sign in required." }) })
  );
  await page.route(`${API}/api/auth/register`, async route => {
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({
      full_name: "New Student",
      email: "newstudent@example.test",
      country_of_residence: "Somalia",
      password: "A-Secure-Test-Password-123"
    });
    await route.fulfill({
      status: 201, contentType: "application/json",
      body: JSON.stringify({ user: { id: "new-student", full_name: "New Student", email: "newstudent@example.test", country_of_residence: "Somalia" } })
    });
  });
  await page.route(`${API}/api/auth/logout`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Signed out." }) })
  );

  await page.goto("/account.html");
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.locator("#full-name").fill("New Student");
  await page.locator("#register-email").fill("newstudent@example.test");
  await page.locator("#country").fill("Somalia");
  await page.locator("#register-password").fill("A-Secure-Test-Password-123");
  await page.locator("#register-form button[type=submit]").click();

  await expect(page.locator("#profile-name")).toHaveText("New Student");
  await expect(page.locator("#register-password")).toHaveValue("");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.locator("#auth-panel")).toBeVisible();
  await expect(page.locator("#auth-message")).toContainText("You have signed out");
});

test("student dashboard loads private workspace and saves profile preferences", async ({ page }) => {
  const saved = [{
    id: "scholarship-1", title: "Test Global Scholarship", provider: "Example University",
    destination_country: "Canada", application_deadline: "2027-03-01",
    official_url: "https://university.example/scholarship"
  }];
  const applications = [{
    id: "application-1", scholarship_id: "scholarship-1", status: "preparing", notes: "Draft my statement",
    title: "Test Global Scholarship", provider: "Example University", destination_country: "Canada",
    application_deadline: "2027-03-01", official_url: "https://university.example/scholarship"
  }];
  let savedProfile = null;

  await page.route(`${API}/api/auth/me`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      user: { full_name: "Test Student", email: "student@example.test", country_of_residence: "Somalia" }
    }) })
  );
  await page.route(`${API}/api/student/saved`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scholarships: saved }) })
  );
  await page.route(`${API}/api/student/applications`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ applications }) })
  );
  await page.route(`${API}/api/student/profile`, async route => {
    if (route.request().method() === "PATCH") {
      savedProfile = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        profile: { full_name: savedProfile.full_name, email: "student@example.test",
          country_of_residence: savedProfile.country_of_residence,
          preferred_destinations: savedProfile.preferred_destinations }
      }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      profile: { full_name: "Test Student", email: "student@example.test",
        country_of_residence: "Somalia", preferred_destinations: ["Canada"] }
    }) });
  });

  await page.goto("/dashboard.html");
  await expect(page.locator("#welcome")).toContainText("Test Student");
  await expect(page.locator("#saved-list")).toContainText("Test Global Scholarship");
  await page.getByRole("tab", { name: "Application tracker" }).click();
  await expect(page.locator("#apps-list")).toContainText("Draft my statement");
  await page.getByRole("tab", { name: "My profile" }).click();
  await expect(page.locator("#profile-email")).toHaveValue("student@example.test");
  await page.locator("#profile-name").fill("Test Student Updated");
  await page.locator("#profile-country").fill("Somalia");
  await page.locator('#destination-options input[value="Canada"]').check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.locator("#status")).toContainText("profile and study preferences have been saved");
  expect(savedProfile).toMatchObject({
    full_name: "Test Student Updated",
    country_of_residence: "Somalia",
    preferred_destinations: ["Canada"]
  });
});
