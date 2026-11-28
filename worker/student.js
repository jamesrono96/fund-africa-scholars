import { readJsonLimited } from "./request.js";
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin"
};
const COOKIE = "fas_session";
const STATUSES = new Set(["interested", "preparing", "submitted", "accepted", "rejected", "withdrawn"]);
const DESTINATIONS = new Set(["United States","United Kingdom","China","Australia","Canada","Germany","Japan","South Korea","France","Netherlands","Sweden","Switzerland","New Zealand","Ireland","Finland","Norway","Denmark","Italy","Spain","Singapore","South Africa","Kenya"]);

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

async function lifetimeMembership(db, userId) {
  const membership = await db.prepare(`
    SELECT m.id, m.starts_at
    FROM memberships m
    JOIN payments p ON p.id = m.payment_id AND p.user_id = m.user_id
    WHERE m.user_id = ?
      AND m.membership_type = 'lifetime'
      AND m.status = 'active'
      AND m.ends_at IS NULL
      AND p.status = 'succeeded'
      AND p.verified_at IS NOT NULL
      AND p.amount_minor = 500
      AND p.currency = 'USD'
    LIMIT 1
  `).bind(userId).first();
  return membership ? { active: true, type: "lifetime", starts_at: membership.starts_at } : { active: false, type: null, starts_at: null };
}
function membershipRequired() {
  return json({
    error: "This is a premium feature. A verified USD $5 lifetime membership is required. Payment activation is not available yet.",
    code: "PREMIUM_MEMBERSHIP_REQUIRED",
    price: { amount_minor: 500, currency: "USD", term: "lifetime" }
  }, 402);
}

async function signedInUser(request, db) {
  const token = cookieValue(request);
  if (!token || token.length > 128) return null;
  const tokenHash = await sha256(token);
  return await db.prepare(`
    SELECT users.id, users.email, users.full_name, users.country_of_residence, users.preferred_destinations
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, new Date().toISOString()).first();
}
function allowedOrigin(request, env) {
  return Boolean(env.APP_ORIGIN && request.headers.get("Origin") === env.APP_ORIGIN);
}
async function readBody(request) {
  return readJsonLimited(request, 4096);
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

  if (url.pathname === "/api/student/membership" && request.method === "GET") {
    return json({ membership: await lifetimeMembership(env.DB, user.id),
      premium_features: ["saved_scholarships", "application_tracker", "deadline_watch", "private_application_notes", "personalised_recommendations"] });
  }

  const premiumRoute = url.pathname === "/api/student/recommendations" ||
    url.pathname === "/api/student/saved" || url.pathname.startsWith("/api/student/saved/") ||
    url.pathname === "/api/student/applications" || url.pathname.startsWith("/api/student/applications/");
  if (premiumRoute) {
    const membership = await lifetimeMembership(env.DB, user.id);
    if (!membership.active) return membershipRequired();
  }

  if (url.pathname === "/api/student/profile" && request.method === "GET") {
    let destinations = [];
    try {
      const parsed = JSON.parse(user.preferred_destinations || "[]");
      if (Array.isArray(parsed)) destinations = parsed.filter(value => typeof value === "string");
    } catch { /* Treat malformed legacy preference data as empty. */ }
    return json({ profile: { full_name: user.full_name, email: user.email,
      country_of_residence: user.country_of_residence || "", preferred_destinations: destinations } });
  }
  if (url.pathname === "/api/student/profile" && request.method === "PATCH") {
    const parsed = await readBody(request);
    if (parsed.error) return json({ error: parsed.error }, 400);
    const body = parsed.body;
    const allowed = new Set(["full_name", "country_of_residence", "preferred_destinations"]);
    if (Object.keys(body).some(key => !allowed.has(key)) || Object.keys(body).length === 0)
      return json({ error: "Only name, country of residence and preferred destinations can be updated." }, 400);
    let fullName = user.full_name;
    let country = user.country_of_residence || "";
    let destinations = [];
    try {
      const current = JSON.parse(user.preferred_destinations || "[]");
      if (Array.isArray(current)) destinations = current.filter(value => typeof value === "string");
    } catch { /* Reset malformed legacy preference data on profile save. */ }
    if (body.full_name !== undefined) {
      if (typeof body.full_name !== "string" || body.full_name.trim().length < 2 || body.full_name.trim().length > 100)
        return json({ error: "Full name must be between 2 and 100 characters." }, 400);
      fullName = body.full_name.trim();
    }
    if (body.country_of_residence !== undefined) {
      if (typeof body.country_of_residence !== "string" || body.country_of_residence.trim().length > 80)
        return json({ error: "Country of residence must be 80 characters or fewer." }, 400);
      country = body.country_of_residence.trim();
    }
    if (body.preferred_destinations !== undefined) {
      if (!Array.isArray(body.preferred_destinations) || body.preferred_destinations.length > 10 ||
          body.preferred_destinations.some(value => typeof value !== "string" || !DESTINATIONS.has(value)) ||
          new Set(body.preferred_destinations).size !== body.preferred_destinations.length)
        return json({ error: "Choose up to 10 valid, unique study destinations." }, 400);
      destinations = body.preferred_destinations;
    }
    await env.DB.prepare(`
      UPDATE users SET full_name = ?, country_of_residence = ?, preferred_destinations = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(fullName, country, JSON.stringify(destinations), user.id).run();
    return json({ ok: true, profile: { full_name: fullName, email: user.email,
      country_of_residence: country, preferred_destinations: destinations } });
  }

  if (url.pathname === "/api/student/recommendations" && request.method === "GET") {
    let destinations = [];
    try {
      const parsed = JSON.parse(user.preferred_destinations || "[]");
      if (Array.isArray(parsed)) destinations = parsed.filter(value => typeof value === "string");
    } catch { /* Empty preferences produce no recommendations. */ }
    if (!destinations.length) return json({ scholarships: [], message: "Add preferred study destinations to your profile to receive recommendations." });
    const result = await env.DB.prepare(`
      SELECT id, title, provider, destination_country, study_levels, subject_areas,
             funding_type, funding_details, eligibility_summary, application_deadline,
             official_url, source_checked_at
      FROM scholarships
      WHERE publication_status = 'published' AND verification_status = 'verified'
        AND destination_country IN (SELECT value FROM json_each(?))
      ORDER BY application_deadline IS NULL, application_deadline ASC
      LIMIT 6
    `).bind(JSON.stringify(destinations)).all();
    return json({ scholarships: result.results || [], based_on: destinations });
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
