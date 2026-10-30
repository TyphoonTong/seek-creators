#!/usr/bin/env node
/**
 * MCP stdio entry — for Claude Desktop / Cursor MCP config.
 * Env: SEEKME_MCP_BASE (default http://127.0.0.1:8011)
 * Optional: --base URL
 */
import { runMcpServer } from "../src/mcp-server.mjs";

function parseBase(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base" && argv[i + 1]) return argv[i + 1];
    if (argv[i] === "--help" || argv[i] === "-h") {
      console.error(`seek-creators-mcp — SeekMe Creator MCP stdio server

Usage:
  seek-creators-mcp [--base URL]

Env:
  SEEKME_MCP_BASE   Registry base (default http://127.0.0.1:8011)

Wire into Claude Desktop / Cursor as an MCP server with command pointing at this script.
`);
      process.exit(0);
    }
  }
  return undefined;
}

const base = parseBase(process.argv.slice(2));
runMcpServer({ base }).catch((err) => {
  console.error(`seek-creators-mcp: ${err.message || err}`);
  process.exit(1);
});
