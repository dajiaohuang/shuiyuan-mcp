# Shuiyuan MCP 中文说明

[English README](README_EN.md)

> **重要：水源使用规则**：发帖、回帖或自动化读取水源前，请先阅读内置的 [水源规则参考](skills/shuiyuan-mcp/references/rules.md)。

Shuiyuan MCP 是一个面向 [水源社区](https://shuiyuan.sjtu.edu.cn/) 的 Model Context Protocol (MCP) 服务器。它基于 Discourse MCP，额外加入了适配水源 jAccount/SSO 登录的 cookie 登录流程：首次使用时打开浏览器让你登录，之后 MCP 可以复用本机保存的登录态访问水源。

## 功能概览

- 通过 MCP 工具搜索、读取水源帖子、读取用户信息、查看草稿和聊天频道等。
- 支持水源 SSO 场景下的 cookie 登录，不需要把 jAccount 密码交给 MCP。
- 默认只读启动，避免 AI 意外发帖。
- 可选择开启写入工具，用于发帖、回复、保存草稿、上传图片等。
- 提供 Windows 脚本和可构建的 `.exe` 启动器。

## 环境要求

- Windows 推荐环境：PowerShell、Node.js >= 24、pnpm/corepack。
- 构建 Windows `.exe` 启动器需要 .NET SDK。
- 首次登录会使用 Playwright 打开 Chromium 登录窗口；如果本机缺少 Chromium，登录命令会自动安装。

检查 Node：

```powershell
node --version
corepack --version
```

安装依赖并构建：

```powershell
corepack pnpm install
corepack pnpm build
```

## 第一次使用：登录水源

运行：

```powershell
.\scripts\shuiyuan-login.ps1
```

命令会打开一个浏览器窗口。你在窗口中完成水源/jAccount 登录即可。登录成功后，程序会自动关闭窗口并保存：

- Cookie 文件：`%APPDATA%\shuiyuan-mcp\cookies.json`
- MCP profile：`%APPDATA%\shuiyuan-mcp\profile.json`

这个 profile 会引用 cookie 文件，后续启动 MCP 时不会把 cookie 放在命令行参数里。

如果想首次登录后立即启动 MCP：

```powershell
.\scripts\shuiyuan-login-and-start.ps1
```

## 日常使用：启动 MCP

登录过一次后，直接运行：

```powershell
.\scripts\shuiyuan-mcp.ps1
```

这个命令会以 stdio transport 启动 MCP，适合配置到 Claude Desktop、Cursor、Codex 等 MCP 客户端。水源专用启动入口默认开启写入工具，相当于自动附加 `--allow_writes --read_only=false`。

如果你想临时用 HTTP transport 调试：

```powershell
.\scripts\shuiyuan-mcp.ps1 --transport http --port 3765
```

健康检查：

```powershell
Invoke-RestMethod http://localhost:3765/health
```

MCP endpoint：

```text
http://localhost:3765/mcp
```

## MCP 客户端配置示例

把下面配置加入你的 MCP 客户端配置文件。路径按你的仓库位置调整：

```json
{
  "mcpServers": {
    "shuiyuan": {
      "command": "powershell",
      "args": [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "D:\\repo\\discourse-mcp\\scripts\\shuiyuan-mcp.ps1"
      ]
    }
  }
}
```

也可以直接使用编译后的 Node 入口：

```json
{
  "mcpServers": {
    "shuiyuan": {
      "command": "node",
      "args": [
        "D:\\repo\\discourse-mcp\\dist\\shuiyuan-mcp.js"
      ]
    }
  }
}
```

## 常用请求示例

连接 MCP 后，可以让 AI 这样使用水源：

```text
在水源搜索“选课 经验”，总结前 5 个相关主题。
读取 topic_id 为 12345 的帖子，并总结主要讨论。
帮我草拟一条回复，但先不要发布。
查看我在水源的草稿列表。
```

底层常用工具包括：

- `discourse_search`
- `discourse_read_topic`
- `discourse_read_post`
- `discourse_get_user`
- `discourse_list_user_posts`
- `discourse_get_draft`
- `discourse_save_draft`
- `discourse_create_post`
- `discourse_create_topic`

## 写入权限

默认配置是只读：

```json
{
  "read_only": true,
  "allow_writes": false
}
```

水源专用启动入口默认开启写入工具，可以发帖、回复、保存草稿或上传文件：

```powershell
.\scripts\shuiyuan-mcp.ps1
```

建议先让 AI 草拟内容，再由你确认发布。写入操作会受到你的水源账号权限限制。

## 构建 Windows 启动器

生成两个 `.exe`：

```powershell
.\scripts\build-shuiyuan-exe.ps1
```

输出目录：

```text
dist-win\
```

生成的入口：

- `dist-win\shuiyuan-mcp-login.exe`：首次使用，打开窗口登录并保存 cookie。
- `dist-win\shuiyuan-mcp.exe`：日常使用，复用已保存 cookie 启动 MCP，默认开启写入工具。

如果希望生成自包含 exe：

```powershell
.\scripts\build-shuiyuan-exe.ps1 -SelfContained
```

## Codex Skill

仓库内置了一套 Codex skill：

```text
skills/shuiyuan-mcp/
skills/deepsearch/
```

`shuiyuan-mcp` 会指导 Codex 使用 `mcp__shuiyuan__` 工具完成水源搜索、读帖、发帖、修正中文编码、选择分类等流程。`deepsearch` 会在你说出关键词 `deepsearch` 或要求深度研究时，指导 Codex 做多轮检索、交叉验证和证据综合。要安装到本机 Codex skills 目录，可以复制：

```powershell
Copy-Item .\skills\shuiyuan-mcp "$env:USERPROFILE\.codex\skills\shuiyuan-mcp" -Recurse -Force
Copy-Item .\skills\deepsearch "$env:USERPROFILE\.codex\skills\deepsearch" -Recurse -Force
```

## 配置文件说明

登录后生成的 profile 大致如下：

```json
{
  "auth_pairs": [
    {
      "site": "https://shuiyuan.sjtu.edu.cn",
      "cookie_file": "C:\\Users\\you\\AppData\\Roaming\\shuiyuan-mcp\\cookies.json"
    }
  ],
  "read_only": true,
  "allow_writes": false,
  "site": "https://shuiyuan.sjtu.edu.cn",
  "log_level": "info",
  "tools_mode": "discourse_api_only"
}
```

`cookie_file` 指向本机 cookie 文件。不要把真实 cookie 文件提交到 GitHub。

## 安全注意事项

- 本项目不会保存你的 jAccount 密码，只保存浏览器登录后的水源 cookie。
- `cookies.json` 等同于你的登录态，请像密码一样保管。
- 不要把 `%APPDATA%\shuiyuan-mcp\cookies.json` 上传到公开仓库。
- 公共仓库里只应该包含源码、脚本和文档，不应该包含真实 profile/cookie。
- 开启写入前确认 MCP 客户端和提示词可信。

## 开发命令

```powershell
corepack pnpm install
corepack pnpm typecheck
corepack pnpm build
corepack pnpm lint
corepack pnpm test
```

项目结构：

- `src/index.ts`：通用 Discourse MCP 入口。
- `src/shuiyuan-login.ts`：水源登录窗口和 cookie 保存流程。
- `src/shuiyuan-mcp.ts`：使用保存的 profile 启动水源 MCP。
- `src/http/client.ts`：HTTP client，支持 API key、User API key 和 cookie auth。
- `scripts/*.ps1` / `scripts/*.cmd`：Windows 启动脚本。
- `packaging/ShuiyuanLauncher`：Windows `.exe` 启动器源码。

## 故障排查

如果提示找不到 profile：

```text
Shuiyuan profile not found
```

先运行：

```powershell
.\scripts\shuiyuan-login.ps1
```

如果水源接口返回未登录或权限不足，重新登录刷新 cookie：

```powershell
.\scripts\shuiyuan-login.ps1
```

如果 HTTP 调试端口被占用，换一个端口：

```powershell
.\scripts\shuiyuan-mcp.ps1 --transport http --port 3766
```

## 许可证

MIT。上游实现来自 Discourse MCP，本仓库在此基础上增加水源登录和启动封装。
