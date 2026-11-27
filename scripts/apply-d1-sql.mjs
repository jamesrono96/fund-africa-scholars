import { readFileSync } from "node:fs";
import process from "node:process";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const databaseId = process.env.D1_DATABASE_ID || "508c3318-27e2-4985-8947-1a84218997a2";
const database = process.env.D1_DATABASE_NAME || "fund-africa-scholars-db";
const file = process.argv[2];

if (!accountId || !token) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.");
  process.exit(2);
}
if (!file) {
  console.error("Usage: node scripts/apply-d1-sql.mjs <sql-file>");
  process.exit(2);
}

const source = readFileSync(file, "utf8");
const statements = [];
let current = "";
let quote = null;
let lineComment = false;
let blockComment = false;

for (let i = 0; i < source.length; i += 1) {
  const ch = source[i];
  const next = source[i + 1];

  if (lineComment) {
    if (ch === "\n") {
      lineComment = false;
      current += "\n";
    }
    continue;
  }
  if (blockComment) {
    if (ch === "*" && next === "/") {
      blockComment = false;
      i += 1;
    }
    continue;
  }
  if (quote) {
    current += ch;
    if (ch === quote) {
      if (next === quote) {
        current += next;
        i += 1;
      } else {
        quote = null;
      }
    } else if (ch === "\\" && next) {
      current += next;
      i += 1;
    }
    continue;
  }
  if (ch === "-" && next === "-") {
    lineComment = true;
    i += 1;
    continue;
  }
  if (ch === "/" && next === "*") {
    blockComment = true;
    i += 1;
    continue;
  }
  if (ch === "'" || ch === '"' || ch === "`") {
    quote = ch;
    current += ch;
    continue;
  }
  if (ch === ";") {
    if (current.trim()) statements.push(current.trim());
    current = "";
    continue;
  }
  current += ch;
}
if (current.trim()) statements.push(current.trim());

if (!statements.length) {
  console.log(`No SQL statements found in ${file}; nothing to apply.`);
  process.exit(0);
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
console.log(`Applying ${statements.length} SQL statements to ${database} through the Cloudflare D1 API.`);

for (let index = 0; index < statements.length; index += 1) {
  const sql = statements[index];
  console.log(`[${index + 1}/${statements.length}] ${sql.split("\n")[0].slice(0, 100)}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Cloudflare D1 API returned non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok || payload.success !== true) {
    const details = (payload.errors || [])
      .map((item) => `${item.code ?? "?"}: ${item.message ?? "Unknown Cloudflare API error"}`)
      .join("; ") || `HTTP ${response.status}`;
    throw new Error(`D1 API rejected statement ${index + 1}/${statements.length}: ${details}`);
  }
}

console.log(`Successfully applied ${statements.length} SQL statements to ${database}.`);
