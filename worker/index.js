const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = env.APP_ORIGIN;
  if (!origin || !allowed || origin !== allowed) return {};
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        ...cors,
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "Content-Type"
      }});
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    if (url.pathname === "/api/health") {
      return json({ status: "ok", service: "fund-africa-scholars-api", environment: env.APP_ENV || "development" }, 200, cors);
    }

    if (url.pathname === "/api/scholarships") {
      if (!env.DB) {
        return json({ error: "Database is not configured yet." }, 503, cors);
      }

      const limitParam = Number.parseInt(url.searchParams.get("limit") || "20", 10);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;
      const country = url.searchParams.get("country");
      const level = url.searchParams.get("level");
      const keyword = url.searchParams.get("q");

      let query = `
        SELECT id, title, provider, destination_country, study_levels,
               subject_areas, funding_type, funding_details,
               eligibility_summary, application_deadline, official_url,
               source_checked_at
        FROM scholarships
        WHERE publication_status = 'published'
          AND verification_status = 'verified'
      `;
      const bindings = [];

      if (country) {
        query += " AND destination_country = ?";
        bindings.push(country);
      }
      if (level) {
        query += " AND EXISTS (SELECT 1 FROM json_each(scholarships.study_levels) WHERE value = ?)";
        bindings.push(level);
      }
      if (keyword) {
        query += " AND (title LIKE ? OR provider LIKE ? OR eligibility_summary LIKE ?)";
        const term = `%${keyword.slice(0, 80)}%`;
        bindings.push(term, term, term);
      }

      query += " ORDER BY application_deadline IS NULL, application_deadline ASC LIMIT ?";
      bindings.push(limit);

      try {
        const result = await env.DB.prepare(query).bind(...bindings).all();
        return json({ scholarships: result.results || [], count: (result.results || []).length }, 200, cors);
      } catch {
        return json({ error: "Unable to retrieve scholarships." }, 500, cors);
      }
    }

    return json({ error: "Not found" }, 404, cors);
  }
};
