# Linux 部署

本文介绍从源码部署 Shuiyuan MCP。首次水源登录需要一个可显示真实浏览器窗口的桌面环境；登录完成后，MCP 服务可以在无图形界面的 Linux 主机上运行。

## 环境要求

- Node.js 24 或更新版本
- Corepack 和 pnpm 10.14.0
- 首次登录时需要 X11/Wayland 桌面
- 使用 systemd 托管时建议使用用户服务，不要以 root 运行

检查环境：

```bash
node --version
corepack --version
corepack pnpm --version
```

## 安装和构建

```bash
git clone https://github.com/dajiaohuang/shuiyuan-mcp.git
cd shuiyuan-mcp
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

Linux 脚本也会在依赖或构建产物缺失时执行以上步骤。

## 配置目录

默认状态目录为：

```text
~/.config/shuiyuan-mcp/
├── cookies.json
├── profile.json
└── browser-profile/
```

目录解析顺序为：

1. 显式设置的 `SHUIYUAN_MCP_HOME`
2. `$XDG_CONFIG_HOME/shuiyuan-mcp`
3. `~/.config/shuiyuan-mcp`

例如为服务指定独立状态目录：

```bash
export SHUIYUAN_MCP_HOME=/var/lib/shuiyuan-mcp
```

保护登录状态：

```bash
STATE_DIR="${SHUIYUAN_MCP_HOME:-${XDG_CONFIG_HOME:-$HOME/.config}/shuiyuan-mcp}"
chmod 700 "$STATE_DIR"
chmod 600 "$STATE_DIR/cookies.json"
chmod 600 "$STATE_DIR/profile.json"
```

`cookies.json` 等同于登录凭据，不要提交到 Git 或发送给不可信的主机。

## 首次登录

先安装 Chromium 和 Linux 系统依赖：

```bash
corepack pnpm exec playwright install --with-deps chromium
```

然后在图形桌面会话中运行：

```bash
./scripts/shuiyuan-login.sh
```

浏览器打开后完成 jAccount 登录。检测到水源会话后，程序会保存 cookie 和 profile 并关闭窗口。

如需登录后立即启动 stdio MCP：

```bash
./scripts/shuiyuan-login-and-start.sh
```

## 无图形服务器

不要在服务器上尝试自动填写 jAccount 密码。推荐流程：

1. 在可信的 Linux 桌面机器上执行首次登录。
2. 停止正在使用该 profile 的 MCP 进程。
3. 使用 SSH/SCP 将 `cookies.json` 和 `profile.json` 安全复制到服务器。
4. 如果目录不同，修改 `profile.json` 中 `cookie_file` 的绝对路径。
5. 将目录权限设置为 `700`，两个 JSON 文件设置为 `600`。
6. 启动服务并验证只读操作。

`browser-profile/` 只用于交互登录和后续刷新登录状态；日常 MCP 启动只需要 profile 及其引用的 cookie 文件。

## stdio 模式

日常启动：

```bash
./scripts/shuiyuan-mcp.sh
```

水源专用入口会按项目既定行为默认启用写工具。MCP 客户端配置示例：

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

stdio 是桌面 MCP 客户端的推荐部署方式，不会开放网络端口。

## HTTP 模式

只监听本机 loopback：

```bash
./scripts/shuiyuan-mcp.sh \
  --transport http \
  --host 127.0.0.1 \
  --port 3765
```

验证：

```bash
curl --fail http://127.0.0.1:3765/health
```

MCP endpoint 为 `http://127.0.0.1:3765/mcp`。

HTTP endpoint 当前没有应用层入站鉴权。不要直接监听公网地址。确需远程访问时，应使用防火墙、SSH tunnel 或带鉴权的可信反向代理。

## systemd 用户服务

仓库提供 `packaging/systemd/shuiyuan-mcp.service`，默认假设仓库位于：

```text
~/.local/share/shuiyuan-mcp
```

安装：

```bash
mkdir -p ~/.config/systemd/user
cp packaging/systemd/shuiyuan-mcp.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now shuiyuan-mcp.service
```

检查：

```bash
systemctl --user status shuiyuan-mcp.service
journalctl --user -u shuiyuan-mcp.service -f
curl --fail http://127.0.0.1:3765/health
```

如果 Node 不在 systemd 用户服务的 `PATH` 中，请把 unit 的 `ExecStart` 改为 Node 24 可执行文件的绝对路径。修改 unit 后运行：

```bash
systemctl --user daemon-reload
systemctl --user restart shuiyuan-mcp.service
```

## 更新和回滚

更新：

```bash
systemctl --user stop shuiyuan-mcp.service
git pull --ff-only
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
systemctl --user start shuiyuan-mcp.service
```

发布前请备份 `cookies.json` 和 `profile.json`。代码回滚不应覆盖状态目录：

```bash
git switch --detach <known-good-tag>
corepack pnpm install --frozen-lockfile
corepack pnpm build
systemctl --user restart shuiyuan-mcp.service
```

## 故障排查

- `Shuiyuan profile not found`：先登录，或检查 `SHUIYUAN_MCP_HOME`。
- Playwright 提示缺少浏览器：运行 `playwright install --with-deps chromium`。
- 浏览器无法打开：确认当前会话具有 `DISPLAY` 或 `WAYLAND_DISPLAY`。
- 水源返回未登录：重新运行登录脚本刷新 cookie。
- systemd 找不到 Node：在 unit 中使用 Node 24 的绝对路径。
- HTTP 健康检查失败：查看 `journalctl --user -u shuiyuan-mcp.service`。
