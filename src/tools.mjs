/**
 * Tool definitions aligned with docs/creator-mcp/tools.schema.json (schema 0.1).
 */
export const TOOL_DEFINITIONS = [
  {
    name: "search_creators",
    description:
      "Search public, discoverable SFW creator cards. Results deep-link to personal pages (never Explore marketplace).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text: display name / bio / tags" },
        tags: { type: "array", items: { type: "string" }, description: "Exact tag match (AND)" },
        languages: { type: "array", items: { type: "string" } },
        online_only: { type: "boolean", default: false },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_creator",
    description: "Fetch one public creator card by slug or creator_id.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        creator_id: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_availability",
    description: "Public availability / online status for a creator slug.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string" },
        from: { type: "string", description: "ISO8601 start" },
        to: { type: "string", description: "ISO8601 end" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_session_link",
    description:
      "Return a deep link to the creator personal page/call entry with MCP attribution. Does not auto-start a call.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string" },
        intent: {
          type: "string",
          enum: ["profile", "call", "book"],
          default: "profile",
        },
        utm_source: { type: "string", default: "mcp" },
      },
      additionalProperties: false,
    },
  },
];

export async function dispatchTool(client, name, args = {}) {
  switch (name) {
    case "search_creators": {
      const data = await client.searchCreators(args);
      const { assertPersonalDeepLinks } = await import("./client.mjs");
      assertPersonalDeepLinks(data?.creators);
      return data;
    }
    case "get_creator": {
      const data = await client.getCreator(args);
      const card = data?.creator || data;
      if (card?.slug || card?.profile_url) {
        const { assertPersonalDeepLinks } = await import("./client.mjs");
        assertPersonalDeepLinks([card]);
      }
      return data;
    }
    case "get_availability":
      return client.getAvailability(args);
    case "create_session_link": {
      const data = await client.createSessionLink({
        ...args,
        intent: args.intent || "profile",
        utm_source: args.utm_source || "mcp",
      });
      const url = data?.url || "";
      if (!url || /\/explore\b/i.test(url)) {
        throw new Error(`Refusing non-personal session link: ${url || "(empty)"}`);
      }
      return data;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
