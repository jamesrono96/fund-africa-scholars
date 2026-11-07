const SESSION_COOKIE = "fas_session";
const LEVELS = new Set(["Undergraduate", "Masters", "PhD", "Postdoctoral", "Diploma", "Certificate"]);
const FUNDING = new Set(["fully_funded", "partially_funded", "tuition_only", "stipend", "unspecified"]);
const VERIFY = new Set(["pending", "verified", "rejected", "needs_review"]);
const PUBLISH = new Set(["draft", "published", "archived"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }});
}
function cookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}
async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function adminUser(request, db) {
  const token = cookie(request, SESSION_COOKIE);
  if (!token || token.length > 128) return null;
  const row = await db.prepare("SELECT users.id, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ? LIMIT 1")
    .bind(await sha256(token), new Date().toISOString()).first();
  return row && row.role === "admin" ? row : null;
}
function originAllowed(request, env) {
  return Boolean(env.APP_ORIGIN && request.headers.get("Origin") === env.APP_ORIGIN);
}
async function bodyJson(request) {
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) return { error: "Content-Type must be application/json." };
  const length = Number(request.headers.get("Content-Length") || "0");
  if (length > 8192) return { error: "Request body is too large." };
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? { body } : { error: "Invalid request body." };
  } catch { return { error: "Invalid JSON body." }; }
}
function stringField(value, max, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const clean = value.trim();
  return clean.length > max || (required && !clean) ? null : clean;
}
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}
function validate(input, partial = false) {
  const output = {};
  const required = { title: 180, provider: 180, destination_country: 100, eligibility_summary: 3000, official_url: 2048 };
  for (const [field, max] of Object.entries(required)) {
    if (partial && !(field in input)) continue;
    const value = stringField(input[field], max, !partial);
    if (value === null) return { error: "Invalid or missing " + field.replaceAll("_", " ") + "." };
    if (field === "official_url" && value) {
      try { if (new URL(value).protocol !== "https:") return { error: "Official source URL must use HTTPS." }; }
      catch { return { error: "Enter a valid official source URL." }; }
    }
    output[field] = value;
  }
  for (const field of ["study_levels", "subject_areas"]) {
    if (partial && !(field in input)) continue;
    const values = input[field] ?? [];
    if (!Array.isArray(values) || values.length > 30 || values.some(v => typeof v !== "string" || !v.trim() || v.length > 80)) return { error: "Invalid " + field.replaceAll("_", " ") + "." };
    const unique = [...new Set(values.map(v => v.trim()))];
    if (field === "study_levels" && unique.some(v => !LEVELS.has(v))) return { error: "One or more study levels are not supported." };
    output[field] = JSON.stringify(unique);
  }
  if (!partial || "funding_type" in input) {
    const value = input.funding_type ?? "unspecified";
    if (!FUNDING.has(value)) return { error: "Invalid funding type." };
    output.funding_type = value;
  }
  if (!partial || "funding_details" in input) {
    const value = input.funding_details ?? "";
    if (typeof value !== "string" || value.length > 2000) return { error: "Funding details must be 2,000 characters or fewer." };
    output.funding_details = value.trim();
  }
  if (!partial || "application_deadline" in input) {
    const value = input.application_deadline ?? "";
    if (value !== "" && !validDate(value)) return { error: "Deadline must be a valid YYYY-MM-DD date or blank." };
    output.application_deadline = value || null;
  }
  if (!partial || "source_checked_at" in input) {
    const value = input.source_checked_at ?? new Date().toISOString().slice(0, 10);
    if (!validDate(value)) return { error: "Source checked date must be YYYY-MM-DD." };
    output.source_checked_at = value;
  }
  if ("verification_status" in input) {
    if (!VERIFY.has(input.verification_status)) return { error: "Invalid verification status." };
    output.verification_status = input.verification_status;
  }
  if ("publication_status" in input) {
    if (!PUBLISH.has(input.publication_status)) return { error: "Invalid publication status." };
    output.publication_status = input.publication_status;
  }
  return { value: output };
}
async function audit(db, adminId, action, id, fields = []) {
  await db.prepare("INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, details_json) VALUES (?, ?, ?, 'scholarship', ?, ?)")
    .bind(crypto.randomUUID(), adminId, action, id, JSON.stringify({ changed_fields: fields })).run();
}
export async function handleAdmin(request, env, url) {
  const isMutation = request.method === "POST" || request.method === "PATCH" || request.method === "DELETE";
  if (isMutation && !originAllowed(request, env)) return json({ error: "Request origin is not allowed." }, 403);
  const admin = await adminUser(request, env.DB);
  if (!admin) return json({ error: "Administrator access required." }, 403);

  if (url.pathname === "/api/admin/scholarships" && request.method === "GET") {
    const result = await env.DB.prepare("SELECT id, title, provider, destination_country, study_levels, subject_areas, funding_type, funding_details, eligibility_summary, application_deadline, official_url, source_checked_at, verification_status, publication_status, created_at, updated_at FROM scholarships ORDER BY updated_at DESC LIMIT 200").all();
    return json({ scholarships: result.results || [] });
  }

  if (url.pathname === "/api/admin/scholarships" && request.method === "POST") {
    const parsed = await bodyJson(request);
    if (parsed.error) return json({ error: parsed.error }, 400);
    const checked = validate(parsed.body);
    if (checked.error) return json({ error: checked.error }, 400);
    const d = checked.value;
    const verification = d.verification_status || "pending";
    const publication = d.publication_status || "draft";
    if (verification === "verified" || publication === "published") return json({ error: "Create the scholarship as a draft first, then complete all seven evidence-backed verification checklist items before marking it verified or publishing it." }, 400);
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO scholarships (id,title,provider,destination_country,study_levels,subject_areas,funding_type,funding_details,eligibility_summary,application_deadline,official_url,source_checked_at,verification_status,publication_status,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id,d.title,d.provider,d.destination_country,d.study_levels,d.subject_areas,d.funding_type,d.funding_details,d.eligibility_summary,d.application_deadline,d.official_url,d.source_checked_at,verification,publication,admin.id,admin.id).run();
    await audit(env.DB, admin.id, "scholarship.created", id, Object.keys(d));
    return json({ id, message: "Scholarship created." }, 201);
  }

  const checklistMatch=url.pathname.match(/^\/api\/admin\/scholarships\/([a-f0-9-]{36})\/verification-checklist$/i);
  if(checklistMatch && request.method==="GET"){
    const rows=await env.DB.prepare("SELECT check_key,decision,evidence_url,evidence_excerpt,reviewer_notes,reviewer_id,reviewed_at FROM scholarship_verification_checks WHERE scholarship_id=? ORDER BY check_key").bind(checklistMatch[1]).all();
    return json({checks:rows.results||[]});
  }
  if(checklistMatch && request.method==="POST"){
    const parsed=await bodyJson(request);if(parsed.error)return json({error:parsed.error},400);
    const b=parsed.body,key=stringField(b.check_key,40,true),decision=b.decision;
    const allowed=["official_source","current_intake","eligible_nationalities","study_level","funding_terms","application_deadline","application_route"];
    if(!allowed.includes(key)||!["confirmed","not_applicable","needs_follow_up"].includes(decision))return json({error:"Choose a valid checklist item and decision."},400);
    const evidenceUrl=stringField(b.evidence_url,2048,true),excerpt=stringField(b.evidence_excerpt,1200,true),notes=stringField(b.reviewer_notes||"",1200);
    if(!evidenceUrl||!excerpt||!notes)return json({error:"An evidence URL and excerpt are required for every checklist decision."},400);
    let source, evidence;
    try{source=new URL(evidenceUrl);evidence=new URL((await env.DB.prepare("SELECT official_url FROM scholarships WHERE id=?").bind(checklistMatch[1]).first())||{} .official_url);}
    catch{return json({error:"Invalid scholarship or evidence URL."},400);}
    if(source.protocol!=="https:"||source.hostname.toLowerCase()!==evidence.hostname.toLowerCase())return json({error:"Evidence must come from the scholarship's official HTTPS domain."},400);
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO scholarship_verification_checks (id,scholarship_id,check_key,decision,evidence_url,evidence_excerpt,reviewer_notes,reviewer_id) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(scholarship_id,check_key) DO UPDATE SET decision=excluded.decision,evidence_url=excluded.evidence_url,evidence_excerpt=excluded.evidence_excerpt,reviewer_notes=excluded.reviewer_notes,reviewer_id=excluded.reviewer_id,reviewed_at=CURRENT_TIMESTAMP")
      .bind(id,checklistMatch[1],key,decision,source.href,excerpt,notes,admin.id).run();
    await audit(env.DB,admin.id,"scholarship.verification_check_saved",checklistMatch[1],{check_key:key,decision});
    return json({message:"Verification checklist item saved."},201);
  }

  const match = url.pathname.match(/^\/api\/admin\/scholarships\/([a-f0-9-]{36})$/i);
  if (!match) return json({ error: "Not found." }, 404);
  const id = match[1];

  if (request.method === "PATCH") {
    const parsed = await bodyJson(request);
    if (parsed.error) return json({ error: parsed.error }, 400);
    const checked = validate(parsed.body, true);
    if (checked.error) return json({ error: checked.error }, 400);
    const d = checked.value;
    const old = await env.DB.prepare("SELECT id,verification_status,publication_status FROM scholarships WHERE id = ?").bind(id).first();
    if (!old) return json({ error: "Scholarship not found." }, 404);
    const verification = d.verification_status ?? old.verification_status;
    const publication = d.publication_status ?? old.publication_status;
    if (verification === "verified" || publication === "published") {
      const checklist=await env.DB.prepare("SELECT COUNT(*) AS total FROM scholarship_verification_checks WHERE scholarship_id=? AND decision IN ('confirmed','not_applicable') AND evidence_excerpt<>'' AND evidence_url<>''").bind(id).first();
      if(Number(checklist?.total||0)!==7)return json({error:"All seven evidence-backed verification checklist items must be confirmed or marked not applicable before verification or publication."},400);
      if(verification!=="verified")return json({error:"A scholarship must be marked verified before publication."},400);
    }
    const fields = Object.keys(d);
    if (!fields.length) return json({ error: "No valid fields supplied." }, 400);
    const assignments = fields.map(field => field + " = ?").join(", ");
    await env.DB.prepare("UPDATE scholarships SET " + assignments + ", updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(...fields.map(field => d[field]),admin.id,id).run();
    await audit(env.DB,admin.id,"scholarship.updated",id,fields);
    return json({ id, message: "Scholarship updated." });
  }

  if (request.method === "DELETE") {
    const old = await env.DB.prepare("SELECT id FROM scholarships WHERE id = ?").bind(id).first();
    if (!old) return json({ error: "Scholarship not found." }, 404);
    await env.DB.prepare("UPDATE scholarships SET publication_status = 'archived', updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(admin.id,id).run();
    await audit(env.DB,admin.id,"scholarship.archived",id);
    return json({ id, message: "Scholarship archived." });
  }
  return json({ error: "Method not allowed." }, 405);
}
