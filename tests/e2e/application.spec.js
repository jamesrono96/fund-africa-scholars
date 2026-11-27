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
  await page.locator("#apps-tab").click();
  await expect(page.locator("#apps-list")).toContainText("Draft my statement");
  await page.locator("#profile-tab").click();
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

test("student can add a saved scholarship to the tracker, update it, save notes and remove the saved item", async ({ page }) => {
  const scholarship = {
    id: "scholarship-2", title: "Somalia Future Leaders Award", provider: "Example Institute",
    destination_country: "United Kingdom", application_deadline: "2027-05-15",
    official_url: "https://institute.example/future-leaders"
  };
  let savedItems = [{ ...scholarship }];
  let applications = [];
  const changes = [];

  await page.route(`${API}/api/auth/me`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      user: { full_name: "Test Student", email: "student@example.test", country_of_residence: "Somalia" }
    }) })
  );
  await page.route(`${API}/api/student/saved**`, async route => {
    const request = route.request();
    if (request.method() === "DELETE") {
      savedItems = [];
      changes.push({ method: "DELETE", url: request.url() });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scholarships: savedItems }) });
  });
  await page.route(`${API}/api/student/applications**`, async route => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      expect(body).toMatchObject({ scholarship_id: "scholarship-2" });
      applications = [{ id: "application-2", scholarship_id: "scholarship-2", status: "interested",
        notes: "", ...scholarship }];
      changes.push({ method: "POST", body });
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, id: "application-2" }) });
      return;
    }
    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      changes.push({ method: "PATCH", body });
      Object.assign(applications[0], body);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ applications }) });
  });
  await page.route(`${API}/api/student/profile`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      profile: { full_name: "Test Student", email: "student@example.test",
        country_of_residence: "Somalia", preferred_destinations: [] }
    }) })
  );

  await page.goto("/dashboard.html");
  await expect(page.locator("#saved-list")).toContainText("Somalia Future Leaders Award");
  await page.getByRole("button", { name: "Add to tracker" }).click();
  await expect(page.locator("#status")).toContainText("added to your application tracker");
  expect(changes.some(change => change.method === "POST")).toBeTruthy();

  await page.locator("#apps-tab").click();
  await expect(page.locator("#apps-list")).toContainText("Somalia Future Leaders Award");
  await page.getByLabel("Application status for Somalia Future Leaders Award").selectOption("submitted");
  await expect(page.locator("#status")).toContainText("Application status updated");
  await page.locator("#apps-list textarea").fill("Submitted the application and uploaded all documents.");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(page.locator("#status")).toContainText("Your notes have been saved");
  expect(changes).toEqual(expect.arrayContaining([
    expect.objectContaining({ method: "PATCH", body: { status: "submitted" } }),
    expect.objectContaining({ method: "PATCH", body: { notes: "Submitted the application and uploaded all documents." } })
  ]));

  await page.locator("#saved-tab").click();
  await page.getByRole("button", { name: "Remove saved" }).click();
  await expect(page.locator("#saved-list")).toContainText("You have not saved any scholarships yet");
  expect(changes.some(change => change.method === "DELETE")).toBeTruthy();
});
