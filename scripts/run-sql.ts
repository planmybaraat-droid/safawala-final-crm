import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function usageAndExit(msg?: string): never {
  if (msg) console.error(msg);
  console.error('Usage: pnpm sql:run <path-to-sql-file>');
  process.exit(1);
}

async function run() {
  const file = process.argv[2];
  if (!file) usageAndExit('Missing SQL file path.');

  const absPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!fs.existsSync(absPath)) usageAndExit(`File not found: ${absPath}`);

  const sql = fs.readFileSync(absPath, 'utf8');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) usageAndExit('DATABASE_URL is not set in environment.');

  const sslRequired = /[?&]sslmode=require/i.test(connectionString);
  const client = new Client({
    connectionString,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  // Listen for NOTICE messages
  client.on('notice', (n: any) => {
    console.log(`[NOTICE] ${n.message}`);
  });

  try {
    // Pre-process \echo lines: print to console and drop from SQL stream
    const lines = sql.split(/\r?\n/);
    const keptLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('\\echo')) {
        const msg = trimmed.replace(/^\\echo\s+/, '');
        console.log(msg.replace(/^'(.*)'$/, '$1'));
      } else {
        keptLines.push(line);
      }
    }

    const sqlText = keptLines.join('\n');

    const statements = splitSqlStatements(sqlText);
    for (const [idx, stmt] of statements.entries()) {
      const label = `Statement ${idx + 1}/${statements.length}`;
      if (!stmt.trim()) continue;
      try {
        const res = await client.query({ text: stmt });
        if ((res as any).rows && (res as any).rows.length) {
          console.log(`\n${label}: ${res.command} (${res.rowCount} rows)`);
          printRows((res as any).rows);
        } else {
          console.log(`\n${label}: ${res.command ?? 'OK'}`);
        }
      } catch (e: any) {
        console.error(`\n${label} FAILED:`, e.message);
        throw e;
      }
    }

    console.log('\nDone.');
  } catch (err: any) {
    console.error('SQL execution failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();

// ---- helpers ----
function printRows(rows: any[]) {
  if (!rows || rows.length === 0) return;
  const cols = Object.keys(rows[0] ?? {});
  if (cols.length === 0) return;
  console.log(cols.join('\t'));
  for (const r of rows) console.log(cols.map((c) => safeCell(r[c])).join('\t'));
}

function safeCell(v: any) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Splits SQL into statements by semicolons while respecting strings, comments, and dollar-quoted blocks
function splitSqlStatements(input: string): string[] {
  const stmts: string[] = [];
  let buf = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null; // like $$ or $tag$

  const startsDollarTag = (s: string, pos: number): string | null => {
    if (s[pos] !== '$') return null;
    let j = pos + 1;
    while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
    if (j < s.length && s[j] === '$') {
      return s.slice(pos, j + 1); // include trailing $
    }
    return null;
  };

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }

    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i += 2;
        inBlockComment = false;
        continue;
      }
      i++;
      continue;
    }

    if (dollarTag) {
      buf += ch;
      if (ch === '$' && input.slice(i - dollarTag.length + 1, i + 1) === dollarTag) {
        dollarTag = null;
      }
      i++;
      continue;
    }

    if (inSingle) {
      buf += ch;
      if (ch === "'" && input[i - 1] !== '\\') inSingle = false;
      i++;
      continue;
    }

    if (inDouble) {
      buf += ch;
      if (ch === '"' && input[i - 1] !== '\\') inDouble = false;
      i++;
      continue;
    }

    // not inside any literal/comment
    if (ch === '-' && next === '-') {
      inLineComment = true;
      buf += ch + next;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      buf += ch + next;
      i += 2;
      continue;
    }

    const tag = startsDollarTag(input, i);
    if (tag) {
      dollarTag = tag;
      buf += tag;
      i += tag.length;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      buf += ch;
      i++;
      continue;
    }

    if (ch === ';') {
      stmts.push(buf);
      buf = '';
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  if (buf.trim()) stmts.push(buf);
  return stmts;
}
