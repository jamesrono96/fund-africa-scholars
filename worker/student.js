const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin"
};
const COOKIE = "fas_session";
const STATUSES = new Set(["interested", "preparing", "submitted", "accepted", "rejected", "withdrawn"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}
function cookieValue(request) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === COOKIE) return rest.join("=");
  }
  return null;
}
async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function signedInUser(request, db) {
  const token = cookieValue(request);
  if (!token || token.length > 128) return null;
  const tokenHash = await sha256(token);
  return await db.prepare(`
    SELECT users.id, users.email, users.full_name, users.country_of_residence
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, new Date().toISOString()).first();
}
function allowedOrigin(request, env) {
  return Boolean(env.APP_ORIGIN && request.headers.get("Origin") === env.APP_ORIGIN);
}
async function readBody(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().includes("application/json")) return { error: "Content-Type must be application/json." };
  const length = Number(request.headers.get("Content-Length") || "0");
  if (length > 4096) return { error: "Request body is too large." };
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? { body } : { error: "Invalid request body." };
  } catch {
    return { error: "Invalid JSON body." };
  }
}
function visibleScholarshipClause() {
  return "s.publication_status = 'published' AND s.verification_status = 'verified'";
}
async function listSaved(db, userId) {
  const result = await db.prepare(`
    SELECT s.id, s.title, s.provider, s.destination_country, s.study_levels,
           s.funding_type, s.funding_details, s.application_deadline, s.official_url,
           ss.created_at AS saved_at
    FROM saved_scholarships ss JOIN scholarships s ON s.id = ss.scholarship_id
    WHERE ss.user_id = ? AND ${visibleScholarshipClause()}
    ORDER BY ss.created_at DESC
  `).bind(userId).all();
  return result.results || [];
}
async function listApplications(db, userId) {
  const result = await db.prepare(`
    SELECT a.id, a.scholarship_id, a.status, a.notes, a.submitted_at,
           a.created_at, a.updated_at, s.title, s.provider,
           s.destination_country, s.application_deadline, s.official_url
    FROM applications a JOIN scholarships s ON s.id = a.scholarship_id
    WHERE a.user_id = ? AND ${visibleScholarshipClause()}
    ORDER BY a.updated_at DESC
  `).bind(userId).all();
  return result.results || [];
}

export async function handleStudent(request, env, url) {
  if (!url.pathname.startsWith("/api/student/")) return json({ error: "Not found." }, 404);
  const user = await signedInUser(request, env.DB);
  if (!user) return json({ error: "Please sign in to access your student dashboard." }, 401);

  if (request.method !== "GET" && !allowedOrigin(request, env)) {
    return json({ error: "Request origin is not allowed." }, 403);
  }

  if (url.pathname === "/api/student/saved" && request.method === "GET") {
    return json({ scholarships: await listSaved(env.DB, user.id) });
  }
  if (url.pathname === "/api/student/saved" && request.method === "POST") {
    const parsed = await readBody(request);
    if (parsed.error) return json({ error: parsed.error }, 400);
    const scholarshipId = parsed.body.scholarship_id;
    if (typeof scholarshipId !== "string" || scholarshipId.length > 80) {
      return json({ error: "A valid scholarship_id is required." }, 400);
    }
    const scholarship = await env.DB.prepare(
      `SELECT id FROM scholarships WHERE id = ? AND ${visibleScholarshipClause()}`
    ).bind(scholarshipId).first();
    if (!scholarship) return json({ error: "This scholarship is not available to save." }, 404);
    await env.DB.prepare(
      "INSERT OR IGNORE INTO saved_scholarships (user_id, scholarship_id) VALUES (?, ?)"
    ).bind(user.id, scholarshipId).run();
    return json({ ok: true }, 201);
  }
  if (url.pathname.startsWith("/api/student/saved/") && request.method === "DELETE") {
    const scholarshipId = decodeURIComponent(url.pathname.slice("/api/student/saved/".length));
    if (!scholarshipId || scholarshipId.length > 80) return json({ error: "Invalid scholarship id." }, 400);
    await env.DB.prepare(
      "DELETE FROM saved_scholarships WHERE user_id = ? AND scholarship_id = ?"
    ).bind(user.id, scholarshipId).run();
    return json({ ok: true });
  }
  if (url.pathname === "/api/student/applications" && request.method === "GET") {
    return json({ applications: await listApplications(env.DB, user.id) });
  }
  if (url.pathname === "/api/student/applications" && request.method === "POST") {
    const parsed = await readBody(request);
    if (parsed.error) return json({ error: parsed.error }, 400);
    const { scholarship_id: scholarshipId, status = "interested", notes = "" } = parsed.body;
    if (typeof scholarshipId !== "string" || scholarshipId.length > 80 ||
        typeof status !== "string" || !STATUSES.has(status) ||
        typeof notes !== "string" || notes.length > 2000) {
      return json({ error: "Check the scholarship, status and notes fields." }, 400);
    }
    const scholarship = await env.DB.prepare(
      `SELECT id FROM scholarships WHERE id = ? AND ${visibleScholarshipClause()}`
    ).bind(scholarshipId).first();
    if (!scholarship) return json({ error: "This scholarship is not available for tracking." }, 404);
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(`
        INSERT INTO applications (id, user_id, scholarship_id, status, notes)
        VALUES (?, ?, ?, ?, ?)
      `).bind(id, user.id, scholarshipId, status, notes.trim()).run();
      return json({ ok: true, id }, 201);
    } catch {
      return json({ error: "This scholarship may already be in your application tracker." }, 409);
    }
  }
  if (url.pathname.startsWith("/api/student/applications/") && request.method === "PATCH") {
    const applicationId = decodeURIComponent(url.pathname.slice("/api/student/applications/".length));
    if (!applicationId || applicationId.length > 80) return json({ error: "Invalid application id." }, 400);
    const parsed = await readBody(request);
    if (parsed.error) return json({ error: parsed.error }, 400);
    const { status, notes } = parsed.body;
    if ((status !== undefined && (typeof status !== "string" || !STATUSES.has(status))) ||
        (notes !== undefined && (typeof notes !== "string" || notes.length > 2000)) ||
        (status === undefined && notes === undefined)) {
      return json({ error: "Provide a valid status or notes value." }, 400);
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM applications WHERE id = ? AND user_id = ?"
    ).bind(applicationId, user.id).first();
    if (!existing) return json({ error: "Application not found." }, 404);
    await env.DB.prepare(`
      UPDATE applications
      SET status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          submitted_at = CASE WHEN ? = 'submitted' THEN COALESCE(submitted_at, CURRENT_TIMESTAMP) ELSE submitted_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(status ?? null, notes === undefined ? null : notes.trim(), status ?? null, applicationId, user.id).run();
    return json({ ok: true });
  }
  return json({ error: "Not found." }, 404);
}
