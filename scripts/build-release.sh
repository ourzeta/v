#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# 程序交付包构建脚本 — qinghuabu-teaching-workbench（青花布讲题视频工作台）
#
# 用法：
#   bash scripts/build-release.sh             # 完整构建：next build(standalone) → 组装 → tar.gz
#   bash scripts/build-release.sh --dry-run   # 干跑：校验前置条件并打印施工计划，不执行 build
#
# 产物：.release/{name}-{version}-{时间戳}.tar.gz
#   内含 standalone 运行时（server.js + .next + node_modules 精简集 + public）
#   + 部署说明 DEPLOY.md + VERSION + manifest.md5（逐文件校验清单）
#
# 依赖：Node.js ≥ 20（bun 更佳）+ 本仓 bun.lock 依赖已安装（bun install / npm install）
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-}"
APP_NAME="$(node -p "require('./package.json').name")"
APP_VERSION="$(node -p "require('./package.json').version")"
STAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_NAME="${APP_NAME}-${APP_VERSION}-${STAMP}"
RELEASE_DIR=".release/${RELEASE_NAME}"
ARCHIVE=".release/${RELEASE_NAME}.tar.gz"

step() { printf '\n▸ %s\n' "$*"; }
die()  { printf '✗ %s\n' "$*" >&2; exit 1; }

# ── 前置校验（dry-run 与完整构建共用） ────────────────────────────────────────
step "前置校验"
command -v node >/dev/null 2>&1 || die "缺少 Node.js（需 ≥ 20）"
PKG_MGR="npm"
if command -v bun >/dev/null 2>&1; then PKG_MGR="bun"; fi
echo "  ✓ Node $(node -v) / 包管理器 ${PKG_MGR}"

[ -f next.config.ts ]      || die "缺少 next.config.ts（不在项目根目录？）"
grep -q 'output: "standalone"' next.config.ts \
  || die 'next.config.ts 未配置 output: "standalone"（standalone 组装的前提）'
echo '  ✓ next.config.ts: standalone 输出已配置'

# 关键源文件齐备性（页面入口 / 服务层 / 播放器 / 交付包组装器）
for f in \
  src/app/page.tsx \
  src/app/board-preview/page.tsx \
  src/server-node/compat.ts \
  server/deliverableStoreHandler.js \
  server/releasePackage.js \
  server/renderDeliverableHtml.js \
  public/row-player.html \
  public/board-preview.html \
; do
  [ -e "$f" ] || die "缺少关键文件: $f"
done
echo '  ✓ 关键源文件齐备（双页面入口 / 服务层 / 播放器 / 交付包组装器）'

[ -d node_modules/next ] || die "依赖未安装（先执行 ${PKG_MGR} install）"
echo "  ✓ 依赖已安装（next $(node -p "require('next/package.json').version")）"

# ── 施工计划 ──────────────────────────────────────────────────────────────────
step "施工计划"
cat <<PLAN
  1. ${PKG_MGR} run build          # next build（Turbopack）→ .next/standalone/ 自包含运行时
  2. 同步静态资源到 standalone     # .next/static + public/ → .next/standalone/（package.json build 已内含）
  3. 组装交付目录 ${RELEASE_DIR}/
       ├─ standalone/             # 解压即跑：node server.js（端口 3000）
       ├─ DEPLOY.md               # 部署说明书（环境变量/启动/反代/验收口径）
       ├─ VERSION                 # ${APP_NAME} ${APP_VERSION} @ ${STAMP}
       └─ manifest.md5            # 逐文件校验清单（md5sum -c 验收）
  4. tar czf ${ARCHIVE} ${RELEASE_DIR}
PLAN

if [ "$MODE" = "--dry-run" ]; then
  step "干跑模式（--dry-run）"
  echo "  ✓ 前置条件全部通过；以上计划未执行（完整构建请在部署机上去掉 --dry-run 运行）"
  exit 0
fi

# ── 正式施工 ──────────────────────────────────────────────────────────────────
step "1/4 next build（standalone）"
"${PKG_MGR}" run build

[ -x .next/standalone/server.js ] || die "build 产物缺少 .next/standalone/server.js"
echo '  ✓ standalone 运行时就绪'

step "2/4 组装交付目录"
mkdir -p "${RELEASE_DIR}"
cp -r .next/standalone "${RELEASE_DIR}/standalone"
cp DEPLOY.md "${RELEASE_DIR}/DEPLOY.md" 2>/dev/null || echo "  ⚠ 未找到 DEPLOY.md（跳过，建议随包交付）"
printf '%s %s @ %s\n' "${APP_NAME}" "${APP_VERSION}" "${STAMP}" > "${RELEASE_DIR}/VERSION"

step "3/4 生成校验清单"
( cd "${RELEASE_DIR}" && find . -type f ! -name manifest.md5 -exec md5sum {} \; > manifest.md5 )
echo "  ✓ $(wc -l < "${RELEASE_DIR}/manifest.md5") 个文件已登记"

step "4/4 打包"
mkdir -p .release
tar czf "${ARCHIVE}" -C .release "${RELEASE_NAME}"
echo "  ✓ ${ARCHIVE}（$(du -h "${ARCHIVE}" | cut -f1)）"

printf '\n✓ 程序交付包完成：%s\n  验收：解压后 md5sum -c manifest.md5；启动见 DEPLOY.md\n' "${ARCHIVE}"
