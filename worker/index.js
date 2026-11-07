import { handleAdmin } from "./admin.js";
import { handleStudent } from "./student.js";
import { handleDiscovery } from "./discovery.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin"
};

const SESSION_COOKIE = "fas_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 310000;
const RATE_WINDOW_SECONDS = 15 * 60;
const RATE_MAX_ATTEMPTS = 8;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !env.APP_ORIGIN || origin !== env.APP_ORIGIN) return {};
  return {
    "access-control-allow-origin": env.APP_ORIGIN,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "vary": "Origin"
  };
}

function withCors(response, cors) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return Boolean(env.APP_ORIGIN && origin === env.APP_ORIGIN);
}

function cookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, saltBytes = crypto.getRandomValues(new Uint8Array(16))) {
  const material = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: PASSWORD_ITERATIONS
  }, material, 256);
  return {
    encoded: `pbkdf2$${PASSWORD_ITERATIONS}$${base64url(saltBytes)}$${base64url(new Uint8Array(bits))}`,
    saltBytes,
    hashBytes: new Uint8Array(bits)
  };
}

async function verifyPassword(password, encoded) {
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2" || Number(parts[1]) !== PASSWORD_ITERATIONS) return false;
  try {
    const salt = fromBase64url(parts[2]);
    const expected = fromBase64url(parts[3]);
    const actual = await hashPassword(password, salt);
    if (expected.length !== actual.hashBytes.length) return false;
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ actual.hashBytes[i];
    return difference === 0;
  } catch {
    return false;
  }
}

async function readJson(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().includes("application/json")) return { error: "Content-Type must be application/json." };
  const length = Number(request.headers.get("Content-Length") || "0");
  if (length > 8192) return { error: "Request body is too large." };
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid request body." };
    return { body };
  } catch {
    return { error: "Invalid JSON body." };
  }
}

async function createSession(db, userId) {
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await db.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), userId, tokenHash, expiresAt).run();
  return token;
}

async function currentUser(request, db) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || token.length > 128) return null;
  const tokenHash = await sha256(token);
  const row = await db.prepare(`
    SELECT users.id, users.email, users.full_name, users.country_of_residence,
           users.preferred_destinations, users.role, users.email_verified_at,
           sessions.id AS session_id, sessions.expires_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, new Date().toISOString()).first();
  return row || null;
}

async function rateLimited(db, identifier) {
  const keyHash = await sha256(identifier);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    "SELECT window_started_at, attempts FROM rate_limits WHERE key_hash = ?"
  ).bind(keyHash).first();
  return Boolean(row && now - row.window_started_at < RATE_WINDOW_SECONDS && row.attempts >= RATE_MAX_ATTEMPTS);
}

async function recordFailure(db, identifier) {
  const keyHash = await sha256(identifier);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`
    INSERT INTO rate_limits (key_hash, window_started_at, attempts, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE
        WHEN excluded.window_started_at - rate_limits.window_started_at >= ? THEN 1
        ELSE rate_limits.attempts + 1
      END,
      window_started_at = CASE
        WHEN excluded.window_started_at - rate_limits.window_started_at >= ? THEN excluded.window_started_at
        ELSE rate_limits.window_started_at
      END,
      updated_at = excluded.updated_at
  `).bind(keyHash, now, now, RATE_WINDOW_SECONDS, RATE_WINDOW_SECONDS).run();
}

async function clearFailures(db, identifier) {
  await db.prepare("DELETE FROM rate_limits WHERE key_hash = ?").bind(await sha256(identifier)).run();
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    country_of_residence: user.country_of_residence,
    preferred_destinations: user.preferred_destinations,
    role: user.role,
    email_verified: Boolean(user.email_verified_at)
  };
}

async function authRegister(request, env) {
  if (!isAllowedOrigin(request, env)) return json({ error: "Request origin is not allowed." }, 403);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { email, password, full_name, country_of_residence = null } = parsed.body;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return json({ error: "Enter a valid email address." }, 400);
  }
  if (typeof full_name !== "string" || full_name.trim().length < 2 || full_name.trim().length > 100) {
    return json({ error: "Enter your full name (2–100 characters)." }, 400);
  }
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    return json({ error: "Your password must be 12–128 characters long." }, 400);
  }
  if (country_of_residence !== null && (typeof country_of_residence !== "string" || country_of_residence.length > 80)) {
    return json({ error: "Invalid country value." }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await rateLimited(env.DB, "register:" + normalizedEmail)) {
    return json({ error: "Too many attempts. Please try again later." }, 429);
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(normalizedEmail).first();
  if (existing) {
    await recordFailure(env.DB, "register:" + normalizedEmail);
    return json({ error: "An account with this email may already exist. Try signing in." }, 409);
  }

  const passwordRecord = await hashPassword(password);
  const userId = crypto.randomUUID();
  try {
    await env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, country_of_residence, role)
      VALUES (?, ?, ?, ?, ?, 'student')
    `).bind(userId, normalizedEmail, passwordRecord.encoded, full_name.trim(), country_of_residence).run();
    const token = await createSession(env.DB, userId);
    await clearFailures(env.DB, "register:" + normalizedEmail);
    return json({ user: { id: userId, email: normalizedEmail, full_name: full_name.trim(), country_of_residence, role: "student", email_verified: false } }, 201, {
      "set-cookie": sessionCookie(token)
    });
  } catch {
    return json({ error: "Unable to create the account. Please try again." }, 500);
  }
}

async function authLogin(request, env) {
  if (!isAllowedOrigin(request, env)) return json({ error: "Request origin is not allowed." }, 403);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: parsed.error }, 400);
  const { email, password } = parsed.body;
  if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || password.length > 128) {
    return json({ error: "Email or password is incorrect." }, 400);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const key = "login:" + normalizedEmail;
  if (await rateLimited(env.DB, key)) return json({ error: "Too many attempts. Please try again later." }, 429);

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, full_name, country_of_residence, preferred_destinations, role, email_verified_at FROM users WHERE email = ?"
  ).bind(normalizedEmail).first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await recordFailure(env.DB, key);
    return json({ error: "Email or password is incorrect." }, 401);
  }

  const token = await createSession(env.DB, user.id);
  await clearFailures(env.DB, key);
  return json({ user: publicUser(user) }, 200, { "set-cookie": sessionCookie(token) });
}

async function authLogout(request, env) {
  if (!isAllowedOrigin(request, env)) return json({ error: "Request origin is not allowed." }, 403);
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (!env.DB) return json({ error: "Database is not configured yet." }, 503, cors);

    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({ status: "ok", service: "fund-africa-scholars-api", environment: env.APP_ENV || "development" }, 200, cors);
      }

      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        const response = await authRegister(request, env);
        return withCors(response, cors);
      }

      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const response = await authLogin(request, env);
        return withCors(response, cors);
      }

      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const response = await authLogout(request, env);
        return withCors(response, cors);
      }

      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const user = await currentUser(request, env.DB);
        return user ? json({ user: publicUser(user) }, 200, cors) : json({ error: "Not signed in." }, 401, cors);
      }

      if (url.pathname.startsWith("/api/student/")) {
        const response = await handleStudent(request, env, url);
        return withCors(response, cors);
      }

      if (url.pathname.startsWith("/api/admin/discovery/")) {
        const response = await handleDiscovery(request, env, url);
        return withCors(response, cors);
      }

      if (url.pathname.startsWith("/api/admin/scholarships")) {
        const response = await handleAdmin(request, env, url);
        return withCors(response, cors);
      }

      if (url.pathname.startsWith("/api/scholarships/") && request.method === "GET") {
        const scholarshipId = decodeURIComponent(url.pathname.slice("/api/scholarships/".length));
        if (!scholarshipId || scholarshipId.length > 80) return json({ error: "Invalid scholarship id." }, 400, cors);
        const scholarship = await env.DB.prepare(`
          SELECT id, title, provider, destination_country, study_levels,
                 subject_areas, funding_type, funding_details, eligibility_summary,
                 application_deadline, official_url, source_checked_at
          FROM scholarships
          WHERE id = ? AND publication_status = 'published'
            AND verification_status = 'verified'
          LIMIT 1
        `).bind(scholarshipId).first();
        return scholarship ? json({ scholarship }, 200, cors) : json({ error: "Scholarship not found." }, 404, cors);
      }

      if (url.pathname === "/api/scholarships" && request.method === "GET") {
        const limitParam = Number.parseInt(url.searchParams.get("limit") || "20", 10);
        const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;
        const filters = {
          country: url.searchParams.get("country"), level: url.searchParams.get("level"),
          keyword: url.searchParams.get("q"), subject: url.searchParams.get("subject"),
          funding: url.searchParams.get("funding"), deadline: url.searchParams.get("deadline"),
          eligibility: url.searchParams.get("eligibility")
        };
        const allowedLevels = new Set(["Undergraduate", "Masters", "PhD", "Postdoctoral", "Diploma", "Certificate"]);
        const allowedFunding = new Set(["fully_funded", "partially_funded", "tuition_only", "stipend", "unspecified"]);
        const allowedDeadlines = new Set(["upcoming", "closing_30", "expired", "not_listed"]);
        if (filters.level && !allowedLevels.has(filters.level)) return json({ error: "Unsupported study level filter." }, 400, cors);
        if (filters.funding && !allowedFunding.has(filters.funding)) return json({ error: "Unsupported funding filter." }, 400, cors);
        if (filters.deadline && !allowedDeadlines.has(filters.deadline)) return json({ error: "Unsupported deadline filter." }, 400, cors);
        let query = `
          SELECT id, title, provider, destination_country, study_levels,
                 subject_areas, funding_type, funding_details, eligibility_summary,
                 application_deadline, official_url, source_checked_at
          FROM scholarships
          WHERE publication_status = 'published' AND verification_status = 'verified'
        `;
        const bindings = [];
        if (filters.country) { query += " AND destination_country LIKE ?"; bindings.push("%" + filters.country.slice(0, 100) + "%"); }
        if (filters.level) {
          query += " AND EXISTS (SELECT 1 FROM json_each(scholarships.study_levels) WHERE value = ?)";
          bindings.push(filters.level);
        }
        if (filters.keyword) {
          query += " AND (title LIKE ? OR provider LIKE ? OR eligibility_summary LIKE ? OR EXISTS (SELECT 1 FROM json_each(scholarships.subject_areas) WHERE value LIKE ?))";
          const term = "%" + filters.keyword.slice(0, 80) + "%";
          bindings.push(term, term, term, term);
        }
        if (filters.subject) {
          query += " AND EXISTS (SELECT 1 FROM json_each(scholarships.subject_areas) WHERE value LIKE ?)";
          bindings.push("%" + filters.subject.slice(0, 80) + "%");
        }
        if (filters.funding) { query += " AND funding_type = ?"; bindings.push(filters.funding); }
        if (filters.eligibility) {
          query += " AND eligibility_summary LIKE ?";
          bindings.push("%" + filters.eligibility.slice(0, 80) + "%");
        }
        if (filters.deadline === "upcoming") query += " AND (application_deadline IS NULL OR application_deadline >= date('now'))";
        if (filters.deadline === "closing_30") query += " AND application_deadline BETWEEN date('now') AND date('now', '+30 days')";
        if (filters.deadline === "expired") query += " AND application_deadline < date('now')";
        if (filters.deadline === "not_listed") query += " AND application_deadline IS NULL";
        query += " ORDER BY application_deadline IS NULL, application_deadline ASC LIMIT ?";
        bindings.push(limit);
        const result = await env.DB.prepare(query).bind(...bindings).all();
        return json({ scholarships: result.results || [], count: (result.results || []).length, limit }, 200, cors);
      }
      return json({ error: "Not found." }, 404, cors);
    } catch {
      return json({ error: "An unexpected server error occurred." }, 500, cors);
    }
  }
};
