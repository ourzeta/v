#!/bin/bash
# ★ 2026-10-29 生产模式服务入口
# 平台的 bun run dev / .zscripts/dev.sh 都汇聚到这里。
#
# ⚠ 移植性地雷（2026-10-30 标注）：下面 P 硬编码为 z-ai 沙箱路径
#   /home/z/my-project，换机部署必须先改这一行。
#
# 为什么跑生产模式而不是 dev 模式：
#   1. Next.js dev 模式自带跨域 Origin 拦截（allowedDevOrigins 白名单机制），
#      任何预览域名/发布域名不在白名单都会被拦 /_next/* 资源——历史上
#      反复出现的「页面能开但交互全死/音频加载失败」即此机制所致。
#      生产模式根本没有这套拦截，任何来源域名一律放行（零限制）。
#   2. 生产模式内存占用与响应速度显著优于 Turbopack dev。
#
# 与发布部署（.zscripts/build.sh → next-service-dist）同构：都以
# standalone 产物 + cwd 相对路径运行，本地验证通过 = 发布行为一致。
set -u

P="/home/z/my-project"
cd "$P"

LOG="$P/dev.log"
# 超 10MB 轮转，防无限增长
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG" 2>/dev/null || echo 0)" -gt 10485760 ]; then
  : > "$LOG"
fi
exec >>"$LOG" 2>&1

echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] prod-serve 启动 (pid $$)"

# 首次运行：没有生产构建则先构建（预热后秒级启动）
if [ ! -f "$P/.next/standalone/server.js" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 未发现生产构建，开始安装依赖并构建..."
  bun install || exit 1
  bun run build || exit 1
fi

S="$P/.next/standalone"

# 组装 standalone 运行时布局（幂等，每次启动校准）
mkdir -p "$S/public"
# 构建期静态资产兜底（build 脚本已拷，缺失才补）
if [ ! -d "$S/.next/static" ] && [ -d "$P/.next/static" ]; then
  mkdir -p "$S/.next"
  cp -r "$P/.next/static" "$S/.next/"
fi
# 清理 Next 文件追踪误带入的工作区杂物（发布包瘦身 + 避免歧义）
for junk in old-2111 upload skills download examples tests; do
  rm -rf "$S/$junk"
done
# 运行时数据目录直连项目真身：先清掉构建期被 trace 进来的快照副本再链接，
# 否则运行时写入落在快照里、重建即丢，且 ln 对已存在目录会在其内部再建链接。
rm -rf "$S/var" "$S/doc"
ln -sfn "$P/var" "$S/var"
ln -sfn "$P/doc" "$S/doc"
# 运行期写盘的资产目录同样直连项目真身（新合成的音频缓存等在重建后不丢失）
for d in audio-cache audio pic board-result; do
  mkdir -p "$P/public/$d"
  rm -rf "$S/public/$d"
  ln -sfn "$P/public/$d" "$S/public/$d"
done
# 环境变量（Prisma DATABASE_URL 等；密钥另内置代码兜底）
cp -f "$P/.env" "$S/.env" 2>/dev/null || true

cd "$S"
export PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 启动 standalone 生产服务器 :3000 (cwd=$S)"
exec bun server.js
