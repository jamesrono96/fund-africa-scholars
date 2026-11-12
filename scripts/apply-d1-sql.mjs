import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";

const database = process.env.D1_DATABASE_NAME || "fund-africa-scholars-db";
const file = process.argv[2];
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

console.log(`Applying ${statements.length} SQL statements from ${file} to ${database}.`);
for (let index = 0; index < statements.length; index += 1) {
  const statement = statements[index];
  console.log(`[${index + 1}/${statements.length}] ${statement.split("\\n")[0].slice(0, 100)}`);
  execFileSync("npx", [
    "wrangler", "d1", "execute", database, "--remote", `--command=${statement}`
  ], { stdio: "inherit", env: process.env });
}
