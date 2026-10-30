# 找创作者 / seek-creators

Open-source **thin CLI + MCP stdio adapter** for the SeekMe Creator MCP registry protocol.

SeekMe is a **registry + personal deep-links**, not a marketplace. This package searches public SFW creator cards and returns links to each creator’s personal page / call entry — never an Explore catalog.

中文：对接 SeekMe Creator MCP 的开源薄客户端。结果只深链到创作者个人页（例如 `https://seekme.me/{slug}?intent=call`），不做逛店式 NSFW 目录。另提供标准 **MCP stdio** 服务，供 Claude Desktop / Cursor 等 agent 发现并调用同一套工具。

## Same protocol as SeekMe registry

Talks HTTP to a SeekMe-compatible Creator MCP registry (`SEEKME_MCP_BASE`):

| Tool / CLI | Registry endpoint (typical) |
|------------|-----------------------------|
| `search_creators` / `search` | `GET /api/v1/mcp/creators/search` |
| `get_creator` / `get` | `GET /api/v1/mcp/creators/{slug}` |
| `get_availability` / `availability` | `GET /api/v1/mcp/creators/{slug}/availability` |
| `create_session_link` / `session-link` | `POST /api/v1/mcp/session-link` |

Schema lives in the SeekMe monorepo: [`TyphoonTong/seekme` → `docs/creator-mcp/`](https://github.com/TyphoonTong/seekme/tree/master/docs/creator-mcp) (see open PRs for the latest draft).

## Requirements

- Node.js 18+
- A reachable registry (SeekMe DEV gateway or compatible self-host)

## Install

```bash
git clone https://github.com/TyphoonTong/seek-creators.git
cd seek-creators
npm install
./bin/seek-creators.mjs --help
./bin/seek-creators-mcp.mjs --help
# optional
npm link   # exposes seek-creators + seek-creators-mcp on PATH
```

## Point at a registry

```bash
export SEEKME_MCP_BASE=http://127.0.0.1:8011   # example: DEV gateway
# or
./bin/seek-creators.mjs --base https://example.com <command>
```

Production SeekMe hosts (when enabled): set `SEEKME_MCP_BASE` to the public gateway base that serves `/api/v1/mcp/*`.

## CLI commands

```bash
./bin/seek-creators.mjs health
./bin/seek-creators.mjs search luna --limit 5
./bin/seek-creators.mjs get luna
./bin/seek-creators.mjs availability luna
./bin/seek-creators.mjs session-link luna --intent call
```

Example `session-link` output:

```json
{
  "schema_version": "0.1",
  "url": "https://seekme.me/luna?intent=call&src=mcp"
}
```

Open that URL in a browser; the user confirms before any session starts. Deep-links go to the **creator personal page / call entry**, not a marketplace Explore feed.

## MCP stdio adapter (Claude Desktop / Cursor)

Exposes the same four tools:

| Tool | Purpose |
|------|---------|
| `search_creators` | SFW discoverable cards → personal `profile_url` |
| `get_creator` | One public card by slug / creator_id |
| `get_availability` | Online / busy / offline |
| `create_session_link` | Deep link with intent; does **not** start a call |

### Cursor (`~/.cursor/mcp.json` or project `.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "seek-creators": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/seek-creators/bin/seek-creators-mcp.mjs"
      ],
      "env": {
        "SEEKME_MCP_BASE": "http://127.0.0.1:8011"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "seek-creators": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/seek-creators/bin/seek-creators-mcp.mjs"
      ],
      "env": {
        "SEEKME_MCP_BASE": "https://seekme.chat"
      }
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/seek-creators` with your clone path. After `npm install`, restart the host app so it picks up the server.

Smoke against a registry:

```bash
export SEEKME_MCP_BASE=http://127.0.0.1:8011
npm run smoke-mcp
```

## Safety

- Server filters: approved + discoverable + age attested + 18+ + no `intimate` category
- Client / MCP adapter refuse results whose `profile_url` looks like Explore / missing personal slug
- No intimate / minor tooling in this package
- Stdio logs go to **stderr** only (stdout is MCP framing)

## Related

- SeekMe monorepo (platform): https://github.com/TyphoonTong/seekme
- This client also ships under `clients/seek-creators/` in that monorepo; **this repo is the standalone public package**.

## License

MIT — see [LICENSE](./LICENSE).
