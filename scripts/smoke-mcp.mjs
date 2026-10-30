#!/usr/bin/env node
/**
 * Smoke: spawn stdio MCP server, initialize, list tools, call search_creators.
 * Usage: SEEKME_MCP_BASE=http://127.0.0.1:8011 node scripts/smoke-mcp.mjs
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../bin/seek-creators-mcp.mjs");
const base = process.env.SEEKME_MCP_BASE || "http://127.0.0.1:8011";

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath, "--base", base],
    env: { ...process.env, SEEKME_MCP_BASE: base },
  });
  const client = new Client({ name: "smoke-mcp", version: "0.1.0" });
  await client.connect(transport);

  const listed = await client.listTools();
  const names = (listed.tools || []).map((t) => t.name).sort();
  const expected = [
    "create_session_link",
    "get_availability",
    "get_creator",
    "search_creators",
  ];
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected tools: ${names.join(", ")}`);
  }
  console.log("tools/list OK:", names.join(", "));

  const result = await client.callTool({
    name: "search_creators",
    arguments: { query: "luna", limit: 3 },
  });
  if (result.isError) {
    throw new Error(`search_creators error: ${JSON.stringify(result.content)}`);
  }
  const text = result.content?.[0]?.text || "";
  const data = JSON.parse(text);
  const creators = data.creators || [];
  console.log(`search_creators OK: ${creators.length} result(s)`);
  for (const c of creators) {
    console.log(`  - ${c.slug} → ${c.profile_url}`);
    if (!c.profile_url || /\/explore\b/i.test(c.profile_url)) {
      throw new Error(`Bad deep-link for ${c.slug}`);
    }
  }

  await client.close();
  console.log("smoke-mcp: PASS");
}

main().catch((err) => {
  console.error("smoke-mcp: FAIL", err.message || err);
  process.exit(1);
});
