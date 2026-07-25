#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 24 or newer." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if (( NODE_MAJOR < 24 )); then
  echo "Node.js 24 or newer is required; found $(node --version)." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  corepack pnpm install --frozen-lockfile
fi

if [[ ! -f dist/shuiyuan-mcp.js ]]; then
  corepack pnpm build
fi

exec node dist/shuiyuan-mcp.js "$@"
