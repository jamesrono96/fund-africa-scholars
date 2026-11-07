const SESSION_COOKIE = "fas_session";
const SOURCE_TYPES = new Set(["university", "government", "foundation", "embassy", "official_portal", "other"]);
const REVIEW = new Set(["pending", "needs_review", "accepted", "rejected", "duplicate"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }});
}
function cookie(request) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === SESSION_COOKIE) return value.join("=");
  }
  return null;
}
async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function requireAdmin(request, db) {
  const token = cookie(request);
  if (!token || token.length > 128) return null;
  const hash = await sha256(token);
  const user = await db.prepare("SELECT users.id, users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>? LIMIT 1")
    .bind(hash, new Date().toISOString()).first();
  return user?.role === "admin" ? user : null;
}
function originAllowed(request, env) {
  return Boolean(env.APP_ORIGIN && request.headers.get("Origin") === env.APP_ORIGIN);
}
async function readBody(request) {
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) return { error: "Content-Type must be application/json." };
  const length = Number(request.headers.get("Content-Length") || "0");
  if (length > 12000) return { error: "Request body is too large." };
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? { body } : { error: "Invalid JSON body." };
  } catch { return { error: "Invalid JSON body." }; }
}
function clean(value, max, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const text = value.trim();
  return text.length > max || (required && !text) ? null : text;
}
function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch { return null; }
}
async function audit(db, adminId, action, type, id, details = {}) {
  await db.prepare("INSERT INTO audit_logs (id,actor_user_id,action,target_type,target_id,details_json) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), adminId, action, type, id, JSON.stringify(details)).run();
}
export async function handleDiscovery(request, env, url) {
  const mutation = ["POST", "PATCH", "DELETE"].includes(request.method);
  if (mutation && !originAllowed(request, env)) return json({ error: "Request origin is not allowed." }, 403);
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return json({ error: "Administrator access required." }, 403);

  if (url.pathname === "/api/admin/discovery/sources" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT id,name,official_domain,source_url,source_type,country,check_frequency_days,notes,is_active,last_checked_at,created_at,updated_at FROM scholarship_sources ORDER BY name LIMIT 300").all();
    return json({ sources: rows.results || [] });
  }
  if (url.pathname === "/api/admin/discovery/sources" && request.method === "POST") {
    const parsed = await readBody(request); if (parsed.error) return json({ error: parsed.error }, 400);
    const b = parsed.body;
    const name = clean(b.name, 160, true), domain = clean(b.official_domain, 253, true), sourceUrl = clean(b.source_url, 2048, true);
    const parsedUrl = sourceUrl && httpsUrl(sourceUrl);
    if (!name || !domain || !parsedUrl || parsedUrl.hostname.toLowerCase() !== domain.toLowerCase().replace(/^www\./, "")) return json({ error: "Provide a name, domain and HTTPS source URL on that same official domain." }, 400);
    const type = b.source_type || "university";
    const frequency = Number(b.check_frequency_days ?? 14);
    if (!SOURCE_TYPES.has(type) || !Number.isInteger(frequency) || frequency < 1 || frequency > 180) return json({ error: "Invalid source type or check frequency." }, 400);
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare("INSERT INTO scholarship_sources (id,name,official_domain,source_url,source_type,country,check_frequency_days,notes) VALUES (?,?,?,?,?,?,?,?)")
        .bind(id,name,domain.toLowerCase().replace(/^www\./, ""),parsedUrl.href,type,clean(b.country,100),frequency,clean(b.notes,1000)).run();
    } catch { return json({ error: "Could not add source. Check whether it already exists." }, 409); }
    await audit(env.DB,admin.id,"discovery.source_created","scholarship_source",id);
    return json({ id, message: "Official source registered. No scan has been run." }, 201);
  }

  if (url.pathname === "/api/admin/discovery/candidates" && request.method === "GET") {
    const status = url.searchParams.get("status");
    if (status && !REVIEW.has(status)) return json({ error: "Invalid review status." }, 400);
    const query = "SELECT c.id,c.title,c.provider,c.destination_country,c.official_url,c.summary,c.application_deadline,c.review_status,c.review_notes,c.discovered_at,s.name AS source_name FROM scholarship_candidates c LEFT JOIN scholarship_sources s ON s.id=c.source_id " + (status ? "WHERE c.review_status=? " : "") + "ORDER BY c.discovered_at DESC LIMIT 200";
    const result = status ? await env.DB.prepare(query).bind(status).all() : await env.DB.prepare(query).all();
    return json({ candidates: result.results || [] });
  }
  if (url.pathname === "/api/admin/discovery/candidates" && request.method === "POST") {
    const parsed = await readBody(request); if (parsed.error) return json({ error: parsed.error }, 400);
    const b = parsed.body;
    const title = clean(b.title,180,true), provider = clean(b.provider,180,true), official = clean(b.official_url,2048,true);
    const parsedUrl = official && httpsUrl(official);
    if (!title || !provider || !parsedUrl) return json({ error: "Candidate title, provider and valid HTTPS official URL are required." }, 400);
    const source = b.source_id ? await env.DB.prepare("SELECT id,official_domain FROM scholarship_sources WHERE id=? AND is_active=1").bind(b.source_id).first() : null;
    if (b.source_id && !source) return json({ error: "Active registered source not found." }, 400);
    if (source && parsedUrl.hostname.toLowerCase().replace(/^www\./,"") !== source.official_domain.toLowerCase().replace(/^www\./,"")) return json({ error: "Candidate URL must use the registered official source domain." }, 400);
    const deadline = b.application_deadline || null;
    if (deadline && (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline+"T00:00:00Z")))) return json({ error: "Deadline must use YYYY-MM-DD." }, 400);
    const id = crypto.randomUUID(), normalized = parsedUrl.origin.toLowerCase()+parsedUrl.pathname.replace(/\/$/,"").toLowerCase();
    const fingerprint = await sha256([title.toLowerCase(),provider.toLowerCase(),deadline || ""].join("|"));
    try {
      await env.DB.prepare("INSERT INTO scholarship_candidates (id,source_id,title,provider,destination_country,official_url,normalized_url,content_fingerprint,summary,application_deadline,extracted_data_json,review_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending')")
        .bind(id,source?.id || null,title,provider,clean(b.destination_country,100),parsedUrl.href,normalized,fingerprint,clean(b.summary,3000),deadline,JSON.stringify({ submitted_by_admin: true })).run();
    } catch { return json({ error: "This source URL or a matching candidate is already in the review queue." }, 409); }
    await audit(env.DB,admin.id,"discovery.candidate_added","scholarship_candidate",id);
    return json({ id, review_status: "pending", message: "Candidate added to manual review. It is not published." }, 201);
  }

  const match = url.pathname.match(/^\/api\/admin\/discovery\/candidates\/([a-f0-9-]{36})$/i);
  if (match && request.method === "PATCH") {
    const parsed = await readBody(request); if (parsed.error) return json({ error: parsed.error }, 400);
    const status = parsed.body.review_status, notes = clean(parsed.body.review_notes,2000);
    if (!REVIEW.has(status)) return json({ error: "A valid review_status is required." }, 400);
    const result = await env.DB.prepare("UPDATE scholarship_candidates SET review_status=?,review_notes=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(status,notes,admin.id,match[1]).run();
    if (!result.meta?.changes) return json({ error: "Candidate not found." }, 404);
    await audit(env.DB,admin.id,"discovery.candidate_reviewed","scholarship_candidate",match[1],{ review_status: status });
    return json({ id: match[1], review_status: status, message: "Review status saved. Publishing remains a separate verified admin action." });
  }
  return json({ error: "Not found." }, 404);
}
