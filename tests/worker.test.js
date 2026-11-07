import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

class MockD1 {
  statements = [];
  prepare(sql) {
    const statement = { sql, values: [] };
    this.statements.push(statement);
    const prepared = {
      bind: (...values) => { statement.values = values; return prepared; },
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({ meta: { changes: 0 } })
    };
    return prepared;
  }
}

function request(path, options = {}) {
  return new Request("https://app.example.test" + path, options);
}

test("health endpoint reports service status without exposing configuration", async () => {
  const response = await worker.fetch(request("/api/health"), {
    DB: new MockD1(), APP_ENV: "test"
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok", service: "fund-africa-scholars-api", environment: "test"
  });
});

test("API returns a clear unavailable response when D1 is not configured", async () => {
  const response = await worker.fetch(request("/api/health"), {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Database is not configured/);
});

test("registration rejects an untrusted origin before database access", async () => {
  const db = new MockD1();
  const response = await worker.fetch(request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify({ email: "student@example.com", password: "long-secure-password", full_name: "Student Name" })
  }), { DB: db, APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 403);
  assert.equal(db.statements.length, 0);
});

test("student endpoints require an authenticated session", async () => {
  const response = await worker.fetch(request("/api/student/saved"), { DB: new MockD1() });
  assert.equal(response.status, 401);
});

test("admin scholarship endpoints reject unauthenticated requests", async () => {
  const response = await worker.fetch(request("/api/admin/scholarships"), { DB: new MockD1() });
  assert.equal(response.status, 403);
});

test("discovery endpoints reject unauthenticated requests", async () => {
  const response = await worker.fetch(request("/api/admin/discovery/sources"), { DB: new MockD1() });
  assert.equal(response.status, 403);
});

test("public scholarship queries are restricted to verified published records", async () => {
  const db = new MockD1();
  const response = await worker.fetch(request("/api/scholarships?limit=10"), { DB: db });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { scholarships: [], count: 0, limit: 10 });
  assert.match(db.statements[0].sql, /publication_status = 'published'/);
  assert.match(db.statements[0].sql, /verification_status = 'verified'/);
});

test("unsupported public study-level filters are rejected", async () => {
  const db = new MockD1();
  const response = await worker.fetch(request("/api/scholarships?level=Anything"), { DB: db });
  assert.equal(response.status, 400);
  assert.equal(db.statements.length, 0);
});

test("publishing requires a previously saved verified state", async () => {
  class AdminMockD1 extends MockD1 {
    prepare(sql) {
      const statement = { sql, values: [] };
      this.statements.push(statement);
      const prepared = {
        bind: (...values) => { statement.values = values; return prepared; },
        first: async () => {
          if (sql.includes("FROM sessions JOIN users")) return { id: "admin-1", role: "admin" };
          if (sql.includes("SELECT id,verification_status,publication_status")) {
            return { id: "123e4567-e89b-12d3-a456-426614174000", verification_status: "pending", publication_status: "draft" };
          }
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 0 } })
      };
      return prepared;
    }
  }
  const token = "test-session-token";
  const response = await worker.fetch(request("/api/admin/scholarships/123e4567-e89b-12d3-a456-426614174000", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.test",
      cookie: "fas_session=" + token
    },
    body: JSON.stringify({ publication_status: "published" })
  }), { DB: new AdminMockD1(), APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /separate step/);
});

test("changing an official source requires resetting verification and publication", async () => {
  class AdminMockD1 extends MockD1 {
    prepare(sql) {
      const statement = { sql, values: [] };
      this.statements.push(statement);
      const prepared = {
        bind: (...values) => { statement.values = values; return prepared; },
        first: async () => {
          if (sql.includes("FROM sessions JOIN users")) return { id: "admin-1", role: "admin" };
          if (sql.includes("SELECT id,verification_status,publication_status")) {
            return { id: "123e4567-e89b-12d3-a456-426614174000", verification_status: "verified", publication_status: "published" };
          }
          if (sql.includes("SELECT official_url FROM scholarships")) return { official_url: "https://old.example.org/scholarships" };
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 0 } })
      };
      return prepared;
    }
  }
  const response = await worker.fetch(request("/api/admin/scholarships/123e4567-e89b-12d3-a456-426614174000", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.test",
      cookie: "fas_session=test-session-token"
    },
    body: JSON.stringify({ official_url: "https://new.example.org/scholarships" })
  }), { DB: new AdminMockD1(), APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /resetting verification_status/);
});

function studentRequest(path, method, body) {
  return request(path, {
    method,
    headers: {
      cookie: "fas_session=valid-test-session",
      origin: "https://app.example.test",
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

class StudentMockD1 extends MockD1 {
  prepare(sql) {
    const statement = { sql, values: [] };
    this.statements.push(statement);
    const prepared = {
      bind: (...values) => { statement.values = values; return prepared; },
      first: async () => {
        if (sql.includes("FROM sessions JOIN users")) return {
          id: "student-1", email: "student@example.test", full_name: "Test Student", country_of_residence: "Kenya", preferred_destinations: '["Canada"]'
        };
        if (sql.includes("FROM scholarships WHERE id =")) return null;
        if (sql.includes("FROM applications WHERE id = ? AND user_id = ?")) return null;
        return null;
      },
      all: async () => ({ results: [] }),
      run: async () => ({ meta: { changes: 0 } })
    };
    return prepared;
  }
}

test("students cannot save a scholarship that is not verified and published", async () => {
  const db = new StudentMockD1();
  const response = await worker.fetch(studentRequest("/api/student/saved", "POST", {
    scholarship_id: "not-public-scholarship"
  }), { DB: db, APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /not available to save/);
  assert.ok(db.statements.some(item => item.sql.includes("publication_status = 'published'") && item.sql.includes("verification_status = 'verified'")));
});

test("students cannot track a scholarship that is not verified and published", async () => {
  const db = new StudentMockD1();
  const response = await worker.fetch(studentRequest("/api/student/applications", "POST", {
    scholarship_id: "not-public-scholarship",
    status: "interested"
  }), { DB: db, APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /not available for tracking/);
  assert.ok(db.statements.some(item => item.sql.includes("publication_status = 'published'") && item.sql.includes("verification_status = 'verified'")));
});

test("students cannot update another user's application", async () => {
  const db = new StudentMockD1();
  const response = await worker.fetch(studentRequest("/api/student/applications/another-users-id", "PATCH", {
    status: "submitted"
  }), { DB: db, APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /Application not found/);
  assert.ok(db.statements.some(item => item.sql.includes("WHERE id = ? AND user_id = ?")));
});


test("students can read their own profile without exposing editable email", async () => {
  const db = new StudentMockD1();
  const response = await worker.fetch(studentRequest("/api/student/profile", "GET"), {
    DB: db, APP_ORIGIN: "https://app.example.test"
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.profile.email, "student@example.test");
  assert.equal(data.profile.full_name, "Test Student");
  assert.deepEqual(data.profile.preferred_destinations, ["Canada"]);
  assert.ok(db.statements.some(item => item.sql.includes("preferred_destinations")));
});

test("students can update name, residence and validated study destinations", async () => {
  const db = new StudentMockD1();
  const response = await worker.fetch(studentRequest("/api/student/profile", "PATCH", {
    full_name: " Updated Student ",
    country_of_residence: "Kenya",
    preferred_destinations: ["United Kingdom", "Canada"]
  }), { DB: db, APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.profile.full_name, "Updated Student");
  assert.deepEqual(data.profile.preferred_destinations, ["United Kingdom", "Canada"]);
  const update = db.statements.find(item => item.sql.includes("UPDATE users"));
  assert.ok(update);
  assert.deepEqual(update.values, ["Updated Student", "Kenya", '["United Kingdom","Canada"]', "student-1"]);
});

test("student profile rejects invalid or duplicate destinations", async () => {
  for (const destinations of [["Mars"], ["Canada", "Canada"], Array(11).fill("Canada")]) {
    const response = await worker.fetch(studentRequest("/api/student/profile", "PATCH", {
      preferred_destinations: destinations
    }), { DB: new StudentMockD1(), APP_ORIGIN: "https://app.example.test" });
    assert.equal(response.status, 400);
  }
});

test("student profile cannot be used to change email or other protected fields", async () => {
  const db = new StudentMockD1();
  const response = await worker.fetch(studentRequest("/api/student/profile", "PATCH", {
    email: "attacker@example.test"
  }), { DB: db, APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 400);
  assert.equal(db.statements.some(item => item.sql.includes("UPDATE users")), false);
});

test("student profile updates require the configured application origin", async () => {
  const db = new StudentMockD1();
  const req = request("/api/student/profile", {
    method: "PATCH",
    headers: { cookie: "fas_session=valid-test-session", origin: "https://attacker.example.test", "content-type": "application/json" },
    body: JSON.stringify({ full_name: "Changed Name" })
  });
  const response = await worker.fetch(req, { DB: db, APP_ORIGIN: "https://app.example.test" });
  assert.equal(response.status, 403);
  assert.equal(db.statements.some(item => item.sql.includes("UPDATE users")), false);
});


test("student recommendations are private and limited to preferred verified destinations", async () => {
  const db = new StudentMockD1();
  const response = await worker.fetch(studentRequest("/api/student/recommendations", "GET"), {
    DB: db, APP_ORIGIN: "https://app.example.test"
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.scholarships, []);
  assert.ok(db.statements.some(item =>
    item.sql.includes("destination_country IN (SELECT value FROM json_each(?))") &&
    item.sql.includes("publication_status = 'published'") &&
    item.sql.includes("verification_status = 'verified'") &&
    item.values[0] === '["Canada"]'
  ));
});

test("student recommendations require an authenticated session", async () => {
  const response = await worker.fetch(request("/api/student/recommendations"), { DB: new MockD1() });
  assert.equal(response.status, 401);
});
