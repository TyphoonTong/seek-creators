/**
 * Thin HTTP client for SeekMe Creator MCP registry (schema 0.1).
 * Speaks the same tools as docs/creator-mcp/SCHEMA.md + tools.schema.json.
 */

const DEFAULT_BASE = process.env.SEEKME_MCP_BASE || "http://127.0.0.1:8011";

export function resolveBase(explicit) {
  const raw = (explicit || DEFAULT_BASE || "").replace(/\/+$/, "");
  if (!raw) throw new Error("SEEKME_MCP_BASE / --base is empty");
  return raw;
}

async function request(base, method, path, { query, body } = {}) {
  const url = new URL(path, base.endsWith("/") ? base : base + "/");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const init = {
    method,
    headers: { Accept: "application/json" },
  };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON response HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  // SeekMe envelope { code, data } or bare payload
  if (json && typeof json === "object" && "code" in json) {
    if (json.code !== 200) {
      const msg = json.message || json.error || JSON.stringify(json);
      throw new Error(`API code ${json.code}: ${msg}`);
    }
    return json.data;
  }
  return json;
}

export function createClient(base) {
  const b = resolveBase(base);
  return {
    base: b,
    health: () => request(b, "GET", "/api/v1/mcp/health"),
    schemaVersion: () => request(b, "GET", "/api/v1/mcp/schema_version"),
    searchCreators: (args = {}) =>
      request(b, "POST", "/api/v1/mcp/tools/search_creators", {
        body: {
          query: args.query,
          tags: args.tags,
          languages: args.languages,
          online_only: args.online_only,
          limit: args.limit,
        },
      }),
    getCreator: (args = {}) =>
      request(b, "POST", "/api/v1/mcp/tools/get_creator", {
        body: { slug: args.slug, creator_id: args.creator_id },
      }),
    getAvailability: (args = {}) =>
      request(b, "POST", "/api/v1/mcp/tools/get_availability", {
        body: { slug: args.slug, from: args.from, to: args.to },
      }),
    createSessionLink: (args = {}) =>
      request(b, "POST", "/api/v1/mcp/tools/create_session_link", {
        body: {
          slug: args.slug,
          intent: args.intent || "profile",
          utm_source: args.utm_source || "mcp",
        },
      }),
    callTool: (name, arguments_) =>
      request(b, "POST", "/api/v1/mcp/tools/call", {
        body: { name, arguments: arguments_ || {} },
      }),
  };
}

/** Soft check: every card must deep-link to a personal page, not Explore. */
export function assertPersonalDeepLinks(creators) {
  const bad = [];
  for (const c of creators || []) {
    const url = c?.profile_url || "";
    if (!url || /\/explore\b/i.test(url) || !c.slug) {
      bad.push(c?.slug || "(missing slug)");
      continue;
    }
    // personal page should include the slug path segment
    try {
      const u = new URL(url);
      if (!u.pathname.includes(`/${c.slug}`)) bad.push(c.slug);
    } catch {
      bad.push(c.slug);
    }
  }
  if (bad.length) {
    throw new Error(
      `Refusing marketplace-style results without personal deep-links: ${bad.join(", ")}`
    );
  }
}
