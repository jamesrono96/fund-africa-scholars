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
