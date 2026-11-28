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
  await page.locator("#login-tab").click();
  await page.locator("#login-email").fill("student@example.test");
  await page.locator("#login-password").fill("CorrectHorseBatteryStaple!");
  await page.locator("#login-form button").click();

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
  await page.route(`${API}/api/student/membership`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      membership: { active: true, type: "lifetime", starts_at: "2026-11-28" },
      premium_features: ["saved_scholarships", "application_tracker", "deadline_watch", "private_application_notes", "personalised_recommendations"]
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
  await expect(page.locator("#welcome")).toHaveText("Welcome, Test");
  await expect(page.locator("#saved-list")).toContainText("Test Global Scholarship");
  await page.locator("#apps-tab").click();
  await expect(page.locator("#apps-list textarea")).toHaveValue("Draft my statement");
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
  await page.route(`${API}/api/student/membership`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      membership: { active: true, type: "lifetime", starts_at: "2026-11-28" },
      premium_features: ["saved_scholarships", "application_tracker", "deadline_watch", "private_application_notes", "personalised_recommendations"]
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

test("free student can browse and manage profile but premium workspace stays locked", async ({ page }) => {
  await page.route(`${API}/api/auth/me`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      user: { full_name: "Free Student", email: "free@example.test", country_of_residence: "Kenya" }
    }) })
  );
  await page.route(`${API}/api/student/membership`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      membership: { active: false, type: null, starts_at: null },
      premium_features: ["saved_scholarships", "application_tracker", "deadline_watch", "private_application_notes", "personalised_recommendations"]
    }) })
  );
  await page.route(`${API}/api/student/profile`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      profile: { full_name: "Free Student", email: "free@example.test", country_of_residence: "Kenya", preferred_destinations: [] }
    }) })
  );
  const premiumCalls = [];
  await page.route(`${API}/api/student/saved**`, route => {
    premiumCalls.push(route.request().url());
    return route.fulfill({ status: 402, contentType: "application/json", body: JSON.stringify({ code: "PREMIUM_MEMBERSHIP_REQUIRED", error: "Membership required." }) });
  });
  await page.route(`${API}/api/student/applications**`, route => {
    premiumCalls.push(route.request().url());
    return route.fulfill({ status: 402, contentType: "application/json", body: JSON.stringify({ code: "PREMIUM_MEMBERSHIP_REQUIRED", error: "Membership required." }) });
  });

  await page.goto("/dashboard.html");
  await expect(page.locator("#membership-panel")).toContainText("Unlock all five premium student tools");
  await expect(page.locator("#membership-panel")).toContainText("one-time USD $5 lifetime membership");
  await expect(page.locator("#profile-email")).toHaveValue("free@example.test");
  await expect(page.locator("#saved-tab")).toBeDisabled();
  await expect(page.locator("#apps-tab")).toBeDisabled();
  expect(premiumCalls).toHaveLength(0);
});

test("admin interface denies a signed-in student account", async ({ page }) => {
  await page.route(`${API}/api/auth/login`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { email: "student@example.test" } }) })
  );
  await page.route(`${API}/api/auth/me`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      user: { id: "student-1", email: "student@example.test", role: "student" }
    }) })
  );
  await page.goto("/admin.html");
  await page.locator("#email").fill("student@example.test");
  await page.locator("#password").fill("Test-Only-Password-123");
  await page.locator("#login-form button").click();
  await expect(page.locator("#login-message")).toContainText("does not have administrator permissions");
  await expect(page.locator("#admin-panel")).toBeHidden();
  await expect(page.locator("#login-panel")).toBeVisible();
});

test("admin dashboard loads mocked records and discovery metrics without publishing", async ({ page }) => {
  const calls = [];
  await page.route(`${API}/api/auth/login`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  );
  await page.route(`${API}/api/auth/me`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      user: { id: "admin-1", email: "admin@example.test", role: "admin" }
    }) })
  );
  await page.route(`${API}/api/admin/**`, async route => {
    const url = new URL(route.request().url());
    calls.push({ path: url.pathname, method: route.request().method() });
    const responses = {
      "/api/admin/scholarships": { scholarships: [] },
      "/api/admin/users": { users: [{ full_name: "Test Student", email: "student@example.test", country_of_residence: "Somalia", role: "student", email_verified_at: null, membership_status: null, created_at: "2026-11-01" }], count: 1, has_more: false },
      "/api/admin/audit-logs": { audit_logs: [{ id: "audit-1", action: "scholarship.updated", target_type: "scholarship", target_id: "scholarship-1", actor_email: "admin@example.test", actor_name: "Test Admin", details_json: '{"changed_fields":["deadline"]}', created_at: "2026-11-02" }], count: 1, has_more: false },
      "/api/admin/discovery/sources": { sources: [] },
      "/api/admin/discovery/candidates": { candidates: [] },
      "/api/admin/discovery/runs": { runs: [] },
      "/api/admin/discovery/summary": {
        candidates: { pending: 2, needs_review: 1, accepted: 0, rejected: 0, duplicate: 0 },
        field_reviews: { approved: 3, rejected: 0, needs_follow_up: 1 },
        runs: { completed: 4, failed: 0, running: 0 }
      }
    };
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify(responses[url.pathname] || {})
    });
  });

  await page.goto("/admin.html");
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("Test-Only-Admin-Password-123");
  await page.locator("#login-form button").click();
  await expect(page.locator("#admin-panel")).toBeVisible();
  await expect(page.locator("#login-panel")).toBeHidden();
  await expect(page.locator("#list-message")).toContainText("0 record(s) loaded");
  await expect(page.locator("#source-message")).toContainText("0 source(s) registered");
  await expect(page.locator("#candidate-message")).toContainText("0 candidate(s) loaded");
  await expect(page.locator("#summary-message")).toContainText("Discovery metrics refreshed");
  await expect(page.locator("#admin-users")).toContainText("student@example.test");
  await expect(page.locator("#admin-users")).toContainText("Not verified");
  await expect(page.locator("#admin-audit")).toContainText("scholarship.updated");
  await expect(page.locator("#admin-audit")).toContainText("admin@example.test");
  await expect(page.locator("#discovery-summary")).toContainText("Pending: 2");
  await expect(page.locator("#discovery-summary")).toContainText("Approved: 3");
  expect(calls.some(call => call.path === "/api/admin/scholarships" && call.method === "GET")).toBeTruthy();
  expect(calls.some(call => call.path === "/api/admin/discovery/summary" && call.method === "GET")).toBeTruthy();
  expect(calls.some(call => call.path === "/api/admin/users" && call.method === "GET")).toBeTruthy();
  expect(calls.some(call => call.path === "/api/admin/audit-logs" && call.method === "GET")).toBeTruthy();
  expect(calls.some(call => call.method === "POST" || call.method === "PATCH" || call.method === "DELETE")).toBeFalsy();

  await page.locator("#logout-button").click();
  await expect(page.locator("#login-panel")).toBeVisible();
  await expect(page.locator("#password")).toHaveValue("");
});

test("student dashboard deadline watch highlights deadlines within 30 days", async ({ page }) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 5);
  const deadline = date.toISOString().slice(0, 10);
  const saved = [{ id: "deadline-scholarship", title: "Deadline Test Award", provider: "Example University",
    destination_country: "Canada", application_deadline: deadline, official_url: "https://university.example/deadline" }];
  await page.route(API + "/api/auth/me", route => route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { full_name: "Test Student", email: "student@example.test" } }) }));
  await page.route(`${API}/api/student/membership`, route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      membership: { active: true, type: "lifetime", starts_at: "2026-11-28" },
      premium_features: ["saved_scholarships", "application_tracker", "deadline_watch", "private_application_notes", "personalised_recommendations"]
    }) })
  );
  await page.route(API + "/api/student/saved", route => route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ scholarships: saved }) }));
  await page.route(API + "/api/student/applications", route => route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ applications: [] }) }));
  await page.route(API + "/api/student/profile", route => route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ profile: { full_name: "Test Student", email: "student@example.test",
      country_of_residence: "Somalia", preferred_destinations: [] } }) }));
  await page.goto("/dashboard.html");
  await expect(page.locator("#deadline-list")).toContainText("Deadline Test Award");
  await expect(page.locator("#deadline-list")).toContainText("5 day(s) remaining");
  await expect(page.locator("#deadline-list a")).toHaveAttribute("href", "https://university.example/deadline");
});
