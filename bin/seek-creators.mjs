#!/usr/bin/env node
/**
 * 找创作者 — SeekMe Creator MCP thin CLI
 * Usage: seek-creators <command> [options]
 */

import {
  createClient,
  assertPersonalDeepLinks,
  resolveBase,
} from "../src/client.mjs";

function printHelp() {
  console.log(`找创作者 / seek-creators — SeekMe Creator MCP CLI (schema 0.1)

Usage:
  seek-creators [--base URL] <command> [args]

Env:
  SEEKME_MCP_BASE   Registry base URL (default: http://127.0.0.1:8011)

Commands:
  health
  search [query] [--tags a,b] [--languages en,zh] [--online] [--limit N]
  get <slug|creator_id>
  availability <slug> [--from ISO] [--to ISO]
  session-link <slug> [--intent profile|call|book] [--utm SOURCE]
  call <tool_name> [--json '{"k":"v"}']

Product rules:
  - Opens / deep-links personal pages (never Explore marketplace catalog)
  - SFW public registry only; no intimate/minor paths
`);
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out.flags[key] = true;
      } else {
        out.flags[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function splitCSV(v) {
  if (!v || v === true) return undefined;
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function outJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const raw = process.argv.slice(2);
  if (raw.length === 0 || raw[0] === "-h" || raw[0] === "--help") {
    printHelp();
    process.exit(0);
  }
  const { _, flags } = parseArgs(raw);
  const base = resolveBase(flags.base);
  const client = createClient(base);
  const cmd = _[0];

  try {
    switch (cmd) {
      case "health": {
        outJSON(await client.health());
        break;
      }
      case "search": {
        const query = _[1] || flags.query || "";
        const data = await client.searchCreators({
          query: query || undefined,
          tags: splitCSV(flags.tags),
          languages: splitCSV(flags.languages),
          online_only: !!flags.online,
          limit: flags.limit ? Number(flags.limit) : undefined,
        });
        assertPersonalDeepLinks(data?.creators);
        outJSON(data);
        break;
      }
      case "get": {
        const id = _[1];
        if (!id) throw new Error("get requires <slug|creator_id>");
        const args = /^\d+$/.test(id) ? { creator_id: id } : { slug: id };
        const data = await client.getCreator(args);
        if (data?.slug || data?.creator) {
          const card = data.creator || data;
          assertPersonalDeepLinks([card]);
        }
        outJSON(data);
        break;
      }
      case "availability": {
        const slug = _[1];
        if (!slug) throw new Error("availability requires <slug>");
        outJSON(
          await client.getAvailability({
            slug,
            from: flags.from,
            to: flags.to,
          })
        );
        break;
      }
      case "session-link":
      case "session_link": {
        const slug = _[1];
        if (!slug) throw new Error("session-link requires <slug>");
        const data = await client.createSessionLink({
          slug,
          intent: flags.intent || "call",
          utm_source: flags.utm || flags["utm-source"] || "mcp",
        });
        const url = data?.url || "";
        if (!url || /\/explore\b/i.test(url)) {
          throw new Error(`Refusing non-personal session link: ${url || "(empty)"}`);
        }
        outJSON(data);
        break;
      }
      case "call": {
        const name = _[1];
        if (!name) throw new Error("call requires <tool_name>");
        let arguments_ = {};
        if (flags.json) arguments_ = JSON.parse(flags.json);
        outJSON(await client.callTool(name, arguments_));
        break;
      }
      default:
        printHelp();
        console.error(`\nUnknown command: ${cmd}`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`seek-creators: ${err.message || err}`);
    process.exit(1);
  }
}

main();
