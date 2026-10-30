/**
 * SeekMe Creator MCP — stdio adapter (schema 0.1).
 * Speaks Model Context Protocol over stdin/stdout; calls SEEKME_MCP_BASE HTTP registry.
 * Logs only to stderr (stdout is reserved for MCP framing).
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "./client.mjs";
import { TOOL_DEFINITIONS, dispatchTool } from "./tools.mjs";

export async function runMcpServer({ base } = {}) {
  const client = createClient(base);
  const server = new Server(
    { name: "seek-creators", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments || {};
    try {
      const data = await dispatchTool(client, name, args);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      const message = err?.message || String(err);
      return {
        isError: true,
        content: [{ type: "text", text: message }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `seek-creators-mcp: ready (registry ${client.base}, schema 0.1, SFW personal deep-links only)`
  );
}
