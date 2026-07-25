# Linux Deployment

This guide covers source-based deployment of Shuiyuan MCP. The initial Shuiyuan login requires a desktop session that can display a real browser window. After login, the MCP server can run on a headless Linux host.

## Requirements

- Node.js 24 or newer
- Corepack and pnpm 10.14.0
- An X11 or Wayland desktop for the initial login
- A non-root user for systemd deployment

Install and build:

```bash
git clone https://github.com/dajiaohuang/shuiyuan-mcp.git
cd shuiyuan-mcp
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

The Linux launcher scripts perform the install or build when the corresponding artifacts are missing.

## State directory

Linux stores session state under `~/.config/shuiyuan-mcp/` by default:

```text
cookies.json
profile.json
browser-profile/
```

The directory resolution order is:

1. `SHUIYUAN_MCP_HOME`
2. `$XDG_CONFIG_HOME/shuiyuan-mcp`
3. `~/.config/shuiyuan-mcp`

Protect the session files:

```bash
STATE_DIR="${SHUIYUAN_MCP_HOME:-${XDG_CONFIG_HOME:-$HOME/.config}/shuiyuan-mcp}"
chmod 700 "$STATE_DIR"
chmod 600 "$STATE_DIR/cookies.json"
chmod 600 "$STATE_DIR/profile.json"
```

Treat `cookies.json` as a credential. Never commit it or copy it to an untrusted host.

## Initial login

Install Chromium and its Linux system dependencies:

```bash
corepack pnpm exec playwright install --with-deps chromium
```

From a graphical desktop session, run:

```bash
./scripts/shuiyuan-login.sh
```

Complete the jAccount login in the browser window. To start the stdio MCP immediately after login:

```bash
./scripts/shuiyuan-login-and-start.sh
```

## Headless servers

Do not automate entry of a jAccount password. Log in on a trusted Linux desktop, then securely copy `cookies.json` and `profile.json` to the server. If the destination differs, update the absolute `cookie_file` path in `profile.json`. Set the state directory to mode `700` and both JSON files to mode `600`.

The daily MCP process only needs the profile and its referenced cookie file. `browser-profile/` is needed when interactively refreshing the login.

## stdio mode

Start the daily MCP entrypoint:

```bash
./scripts/shuiyuan-mcp.sh
```

The Shuiyuan entrypoint intentionally enables write tools by default. A desktop MCP client can launch the absolute script path:

```json
{
  "mcpServers": {
    "shuiyuan": {
      "command": "/home/you/.local/share/shuiyuan-mcp/scripts/shuiyuan-mcp.sh",
      "args": []
    }
  }
}
```

stdio is the recommended mode for desktop MCP clients because it does not open a network port.

## HTTP mode

Bind explicitly to loopback:

```bash
./scripts/shuiyuan-mcp.sh \
  --transport http \
  --host 127.0.0.1 \
  --port 3765

curl --fail http://127.0.0.1:3765/health
```

The MCP endpoint is `http://127.0.0.1:3765/mcp`.

The HTTP endpoint does not currently provide application-level inbound authentication. Do not bind it directly to a public interface. Use a firewall, SSH tunnel, or a trusted authenticated reverse proxy for remote access.

## systemd user service

The provided `packaging/systemd/shuiyuan-mcp.service` assumes the repository is installed at:

```text
~/.local/share/shuiyuan-mcp
```

Install and start it:

```bash
mkdir -p ~/.config/systemd/user
cp packaging/systemd/shuiyuan-mcp.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now shuiyuan-mcp.service
```

Inspect the service:

```bash
systemctl --user status shuiyuan-mcp.service
journalctl --user -u shuiyuan-mcp.service -f
curl --fail http://127.0.0.1:3765/health
```

If Node is not available in the systemd user manager's `PATH`, replace `/usr/bin/env node` in `ExecStart` with the absolute path to a Node 24 executable.

## Updating

```bash
systemctl --user stop shuiyuan-mcp.service
git pull --ff-only
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
systemctl --user start shuiyuan-mcp.service
```

Back up `cookies.json` and `profile.json` before maintenance. Code updates and rollbacks should not overwrite the state directory.

## Troubleshooting

- `Shuiyuan profile not found`: log in first or check `SHUIYUAN_MCP_HOME`.
- Missing Playwright browser: run `playwright install --with-deps chromium`.
- Browser window does not open: verify `DISPLAY` or `WAYLAND_DISPLAY`.
- Shuiyuan reports that you are logged out: rerun the login script.
- systemd cannot find Node: use an absolute Node 24 path in the unit.
- HTTP health check fails: inspect `journalctl --user -u shuiyuan-mcp.service`.
