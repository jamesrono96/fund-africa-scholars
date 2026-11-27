import process from "node:process";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const expectedName = "fund-africa-scholars-db";
const expectedId = "508c3318-27e2-4985-8947-1a84218997a2";

if (!accountId || !token) throw new Error("Missing Cloudflare credentials.");
console.log("Checking Cloudflare account and D1 database identity.");
console.log("Configured account ID:", accountId);

const headers = { Authorization: `Bearer ${token}` };
const base = "https://api.cloudflare.com/client/v4";
const listResponse = await fetch(`${base}/accounts/${accountId}/d1/database`, { headers });
const list = await listResponse.json();
if (!listResponse.ok || list.success !== true) {
  const detail = (list.errors || []).map((e) => `${e.code}: ${e.message}`).join("; ");
  throw new Error(`Cloudflare D1 list API failed (HTTP ${listResponse.status}): ${detail}`);
}
const databases = list.result || [];
for (const db of databases) {
  console.log(`Visible database: name=${db.name}; uuid=${db.uuid}; version=${db.version ?? "unknown"}`);
}
const match = databases.find((db) => db.name === expectedName);
if (!match) {
  throw new Error(`The configured account does not list database "${expectedName}". Do not run schema changes.`);
}
if (match.uuid !== expectedId) {
  throw new Error(`Database name exists, but UUID differs. Dashboard/list UUID is ${match.uuid}; repository expects ${expectedId}. Update the repository configuration before applying SQL.`);
}
const getResponse = await fetch(`${base}/accounts/${accountId}/d1/database/${match.uuid}`, { headers });
const detail = await getResponse.json();
if (!getResponse.ok || detail.success !== true) {
  const errors = (detail.errors || []).map((e) => `${e.code}: ${e.message}`).join("; ");
  throw new Error(`Cloudflare Get D1 Database failed (HTTP ${getResponse.status}): ${errors}`);
}
console.log("D1 target identity verified using Cloudflare REST API.");
console.log("Database name:", detail.result.name);
console.log("Database UUID:", detail.result.uuid);
