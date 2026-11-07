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

function decodeText(value) {
  return value.replace(/<[^>]*>/g," ").replace(/&amp;/gi,"&").replace(/&nbsp;/gi," ").replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/\s+/g," ").trim();
}
async function limitedText(response, maxBytes = 900000) {
  if (!response.body) return "";
  const reader = response.body.getReader(); const chunks=[]; let size=0;
  while (true) {
    const {done,value}=await reader.read(); if(done) break;
    size += value.byteLength;
    if(size > maxBytes){await reader.cancel();throw new Error("Source page exceeded the scan size limit.");}
    chunks.push(value);
  }
  const merged=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder("utf-8",{fatal:false}).decode(merged);
}
async function scanSource(source, db, adminId) {
  const runId=crypto.randomUUID();
  await db.prepare("INSERT INTO discovery_runs (id,source_id,status,started_at,created_by) VALUES (?,?,'running',CURRENT_TIMESTAMP,?)").bind(runId,source.id,adminId).run();
  try {
    const pageUrl=httpsUrl(source.source_url);
    if(!pageUrl || pageUrl.hostname.toLowerCase().replace(/^www\\./,"")!==source.official_domain.toLowerCase().replace(/^www\\./,"")) throw new Error("Registered source URL no longer matches its official domain.");
    const response=await fetch(pageUrl.href,{method:"GET",redirect:"manual",headers:{"Accept":"text/html,application/xhtml+xml","User-Agent":"FundAfricaScholarsSourceChecker/1.0 (manual admin-triggered check)"}});
    if(response.status>=300 && response.status<400) throw new Error("Source redirected. Update the registered URL after verifying the official destination.");
    if(!response.ok) throw new Error("Official source returned HTTP "+response.status+".");
    const type=response.headers.get("content-type")||"";
    if(!type.toLowerCase().includes("text/html") && !type.toLowerCase().includes("application/xhtml+xml")) throw new Error("Source did not return an HTML page.");
    const html=await limitedText(response);
    const anchors=html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi)||[];
    const keywords=/scholarship|fellowship|studentship|financial aid|funding opportunity|grant for students|bursary/i;
    let found=0,duplicates=0,skipped=0;
    for(const anchor of anchors.slice(0,3000)){
      const hrefMatch=anchor.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
      if(!hrefMatch) continue;
      const title=decodeText(anchor.replace(/^<a\b[^>]*>/i,"").replace(/<\/a>$/i,""));
      if(!title || title.length<5 || title.length>180 || !keywords.test(title)) continue;
      let candidateUrl;
      try{candidateUrl=new URL(hrefMatch[2],pageUrl);}catch{skipped++;continue;}
      if(candidateUrl.protocol!=="https:" || candidateUrl.hostname.toLowerCase().replace(/^www\\./,"")!==source.official_domain.toLowerCase().replace(/^www\\./,"") || candidateUrl.username || candidateUrl.password){skipped++;continue;}
      candidateUrl.hash="";
      const normalized=candidateUrl.origin.toLowerCase()+candidateUrl.pathname.replace(/\/$/,"").toLowerCase();
      const id=crypto.randomUUID(), fingerprint=await sha256([title.toLowerCase(),source.name.toLowerCase()].join("|"));
      try{
        await db.prepare("INSERT INTO scholarship_candidates (id,source_id,discovery_run_id,title,provider,destination_country,official_url,normalized_url,content_fingerprint,summary,extracted_data_json,review_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending')")
          .bind(id,source.id,runId,title,source.name,source.country,candidateUrl.href,normalized,fingerprint,"Link title found on registered official source page.",JSON.stringify({discovery_method:"same_domain_anchor_keyword_scan",requires_human_verification:true})).run();
        found++;
      }catch{duplicates++;}
    }
    await db.prepare("UPDATE discovery_runs SET status='completed',completed_at=CURRENT_TIMESTAMP,candidates_found=? WHERE id=?").bind(found,runId).run();
    await db.prepare("UPDATE scholarship_sources SET last_checked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(source.id).run();
    await audit(db,adminId,"discovery.source_scanned","scholarship_source",source.id,{run_id:runId,candidates_found:found,duplicates,skipped});
    return {run_id:runId,status:"completed",candidates_found:found,duplicates,skipped};
  }catch(error){
    await db.prepare("UPDATE discovery_runs SET status='failed',completed_at=CURRENT_TIMESTAMP,error_summary=? WHERE id=?").bind(String(error.message||"Scan failed").slice(0,500),runId).run();
    await audit(db,adminId,"discovery.source_scan_failed","scholarship_source",source.id,{run_id:runId});
    return {run_id:runId,status:"failed",error:"The source check failed. Review the registered page and try again."};
  }
}


function htmlText(html) {
  return decodeText(html.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," "));
}
function metaContent(html, key) {
  const a = '<meta[^>]+(?:name|property)=["\\x27]' + key + '["\\x27][^>]+content=["\\x27]([^"\\x27]*)["\\x27]';
  const b = '<meta[^>]+content=["\\x27]([^"\\x27]*)["\\x27][^>]+(?:name|property)=["\\x27]' + key + '["\\x27]';
  const first=html.match(new RegExp(a,"i"))||html.match(new RegExp(b,"i"));
  return first?decodeText(first[1]):"";
}
function extractScholarshipFields(html, candidate) {
  const text=htmlText(html).slice(0,18000);
  const titleMatch=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle=titleMatch?decodeText(titleMatch[1]):"";
  const description=metaContent(html,"description")||metaContent(html,"og:description");
  const fundingMatches=[...text.matchAll(/(?:fully funded|full scholarship|tuition fee(?:s)?|tuition waiver|living stipend|monthly stipend|travel allowance|accommodation|partially funded)/gi)].slice(0,12).map(m=>m[0]);
  const levelMatches=[...new Set((text.match(/\b(?:undergraduate|bachelor'?s?|master'?s?|postgraduate|doctoral|PhD|doctorate|postdoctoral)\b/gi)||[]).map(v=>v.toLowerCase()))].slice(0,10);
  const eligibility=[];
  for(const match of text.matchAll(/.{0,100}\b(?:eligible|eligibility|applicants? must|citizens? of|nationality|minimum requirement|must have)\b.{0,180}/gi)){eligibility.push(match[0].trim());if(eligibility.length>=8)break;}
  const dateMatches=[...text.matchAll(/\b(?:deadline|apply by|applications close|closing date)\b[^.\n]{0,90}/gi)].slice(0,8).map(m=>m[0].trim());
  const isoDates=[...new Set((text.match(/\b20\d{2}-\d{2}-\d{2}\b/g)||[]))].slice(0,10);
  return {page_title:pageTitle||candidate.title,description,funding_phrases:[...new Set(fundingMatches)],study_level_mentions:levelMatches,eligibility_snippets:eligibility,deadline_text:dateMatches,dates_found:isoDates,extraction_method:"rule_based_html_review_assist",requires_human_verification:true};
}
async function extractCandidate(candidateId, db, adminId) {
  const candidate=await db.prepare("SELECT c.*,s.official_domain FROM scholarship_candidates c LEFT JOIN scholarship_sources s ON s.id=c.source_id WHERE c.id=?").bind(candidateId).first();
  if(!candidate)return {error:"Candidate not found.",status:404};
  const pageUrl=httpsUrl(candidate.official_url);
  if(!pageUrl || !candidate.official_domain || pageUrl.hostname.toLowerCase().replace(/^www\./,"")!==candidate.official_domain.toLowerCase().replace(/^www\./,""))return {error:"Candidate is not linked to a registered official source domain.",status:400};
  const response=await fetch(pageUrl.href,{method:"GET",redirect:"manual",headers:{"Accept":"text/html,application/xhtml+xml","User-Agent":"FundAfricaScholarsReviewAssistant/1.0"}});
  if(response.status>=300&&response.status<400)return {error:"The page redirected. Verify and update the source URL manually.",status:409};
  if(!response.ok)return {error:"Official page returned HTTP "+response.status+".",status:502};
  const contentType=response.headers.get("content-type")||"";
  if(!/text\/html|application\/xhtml\+xml/i.test(contentType))return {error:"Official page did not return HTML.",status:415};
  const html=await limitedText(response,900000);
  const extracted=extractScholarshipFields(html,candidate);
  const contentHash=await sha256(html);
  const previous=await db.prepare("SELECT id,content_hash,fetched_at FROM candidate_source_snapshots WHERE candidate_id=? ORDER BY fetched_at DESC LIMIT 1").bind(candidateId).first();
  const changed=Boolean(previous && previous.content_hash!==contentHash);
  const snapshotId=crypto.randomUUID();
  await db.prepare("INSERT INTO candidate_source_snapshots (id,candidate_id,source_id,official_url,content_hash,page_title,description,body_excerpt,change_detected,previous_snapshot_id) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .bind(snapshotId,candidateId,candidate.source_id,candidate.official_url,contentHash,extracted.page_title,extracted.description,htmlText(html).slice(0,4000),changed?1:0,previous?.id||null).run();
  await db.prepare("UPDATE scholarship_candidates SET summary=CASE WHEN ?<>'' THEN ? ELSE summary END,extracted_data_json=?,review_status=CASE WHEN ?=1 AND review_status NOT IN ('rejected','duplicate') THEN 'needs_review' ELSE review_status END,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .bind(extracted.description,extracted.description,changed?1:0,JSON.stringify(extracted),candidateId).run();
  await audit(db,adminId,changed?"discovery.candidate_source_changed":"discovery.candidate_extracted","scholarship_candidate",candidateId,{method:extracted.extraction_method,source_changed:changed,previous_snapshot_id:previous?.id||null,snapshot_id:snapshotId});
  return {candidate_id:candidateId,extracted,source_changed:changed,previous_checked_at:previous?.fetched_at||null,message:changed?"The official page differs from the previous check. Candidate moved to Needs review; compare the changes manually.":"Extraction suggestions saved for human review. No scholarship facts were verified or published."};
}

export async function handleDiscovery(request, env, url) {
  const mutation = ["POST", "PATCH", "DELETE"].includes(request.method);
  if (mutation && !originAllowed(request, env)) return json({ error: "Request origin is not allowed." }, 403);
  const admin = await requireAdmin(request, env.DB);
  if (!admin) return json({ error: "Administrator access required." }, 403);


  const scanMatch=url.pathname.match(/^\/api\/admin\/discovery\/sources\/([a-f0-9-]{36})\/check$/i);
  if(scanMatch && request.method==="POST"){
    const source=await env.DB.prepare("SELECT id,name,official_domain,source_url,country,is_active FROM scholarship_sources WHERE id=?").bind(scanMatch[1]).first();
    if(!source || !source.is_active) return json({error:"Active registered source not found."},404);
    const result=await scanSource(source,env.DB,admin.id);
    return json(result,result.status==="completed"?200:502);
  }
  if(url.pathname==="/api/admin/discovery/runs" && request.method==="GET"){
    const rows=await env.DB.prepare("SELECT r.id,r.status,r.started_at,r.completed_at,r.candidates_found,r.error_summary,s.name AS source_name FROM discovery_runs r LEFT JOIN scholarship_sources s ON s.id=r.source_id ORDER BY r.created_at DESC LIMIT 100").all();
    return json({runs:rows.results||[]});
  }

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

  const historyMatch=url.pathname.match(/^\/api\/admin\/discovery\/candidates\/([a-f0-9-]{36})\/history$/i);
  if(historyMatch && request.method==="GET"){
    const rows=await env.DB.prepare("SELECT id,content_hash,page_title,description,fetched_at,change_detected,previous_snapshot_id FROM candidate_source_snapshots WHERE candidate_id=? ORDER BY fetched_at DESC LIMIT 30").bind(historyMatch[1]).all();
    return json({snapshots:rows.results||[]});
  }

  if (url.pathname === "/api/admin/discovery/candidates" && request.method === "GET") {
    const status = url.searchParams.get("status");
    if (status && !REVIEW.has(status)) return json({ error: "Invalid review status." }, 400);
    const query = "SELECT c.id,c.title,c.provider,c.destination_country,c.official_url,c.summary,c.application_deadline,c.review_status,c.review_notes,c.extracted_data_json,c.scholarship_id,c.discovered_at,s.name AS source_name,(SELECT fetched_at FROM candidate_source_snapshots ss WHERE ss.candidate_id=c.id ORDER BY fetched_at DESC LIMIT 1) AS last_source_check_at,(SELECT change_detected FROM candidate_source_snapshots ss WHERE ss.candidate_id=c.id ORDER BY fetched_at DESC LIMIT 1) AS latest_source_changed FROM scholarship_candidates c LEFT JOIN scholarship_sources s ON s.id=c.source_id " + (status ? "WHERE c.review_status=? " : "") + "ORDER BY c.discovered_at DESC LIMIT 200";
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
  const extractMatch=url.pathname.match(/^\/api\/admin\/discovery\/candidates\/([a-f0-9-]{36})\/extract$/i);
  if(extractMatch && request.method==="POST"){
    try{const result=await extractCandidate(extractMatch[1],env.DB,admin.id);return json(result,result.status||200);}
    catch{return json({error:"Unable to inspect the official page. Check the source and try again."},502);}
  }
  const draftMatch = url.pathname.match(/^\/api\/admin\/discovery\/candidates\/([a-f0-9-]{36})\/create-draft$/i);
  if (draftMatch && request.method === "POST") {
    const candidate = await env.DB.prepare("SELECT * FROM scholarship_candidates WHERE id = ?").bind(draftMatch[1]).first();
    if (!candidate) return json({ error: "Candidate not found." }, 404);
    if (candidate.review_status !== "accepted") return json({ error: "Review and accept this candidate before creating a draft." }, 409);
    if (candidate.scholarship_id) return json({ error: "A scholarship draft already exists for this candidate.", scholarship_id: candidate.scholarship_id }, 409);
    const id = crypto.randomUUID();
    const eligibility = "NOT VERIFIED — administrator must confirm eligibility details from the official source before publication.";
    await env.DB.prepare("INSERT INTO scholarships (id,title,provider,destination_country,study_levels,subject_areas,funding_type,funding_details,eligibility_summary,application_deadline,official_url,source_checked_at,verification_status,publication_status,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending','draft',?,?)")
      .bind(id,candidate.title,candidate.provider,candidate.destination_country || "To be confirmed","[]","[]","unspecified","",eligibility,candidate.application_deadline,candidate.official_url,new Date().toISOString().slice(0,10),admin.id,admin.id).run();
    await env.DB.prepare("UPDATE scholarship_candidates SET scholarship_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id,candidate.id).run();
    await audit(env.DB,admin.id,"discovery.candidate_converted_to_draft","scholarship",id,{candidate_id:candidate.id});
    return json({ id, candidate_id:candidate.id, verification_status:"pending", publication_status:"draft", message:"Draft created. Verify every field from the official source before publication." },201);
  }

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
