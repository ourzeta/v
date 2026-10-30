#!/bin/bash
# 从 GitHub 仓库快照恢复应用代码到平台工作区（平台结构保留）
set -e
R="/home/z/my-project/old-2111"
P="/home/z/my-project"

echo "== [1] 清理脚手架应用文件 =="
rm -rf "$P/src" "$P/public" "$P/prisma" "$P/db" "$P/examples" "$P/mini-services" "$P/tests"
rm -f "$P/package.json" "$P/next.config.ts" "$P/tsconfig.json" "$P/postcss.config.mjs" \
      "$P/eslint.config.mjs" "$P/components.json" "$P/tailwind.config.ts" "$P/bun.lock" \
      "$P/next-env.d.ts" "$P/dev.log" "$P/README.md"
rm -rf "$P/.zscripts/mini-service-"*.log 2>/dev/null || true

echo "== [2] 复制仓库应用代码 =="
cp -r "$R/src" "$P/src"
cp -r "$R/server" "$P/server"
cp -r "$R/public" "$P/public"
cp -r "$R/doc" "$P/doc"
cp -r "$R/var" "$P/var"
# ★ KI-004（2026-10-30）：prisma/ 与 db/ 已随 Prisma 死基建拆除，不再复制
# 仓库 scripts 内容并入平台 scripts（不覆盖已存在的 init-fullstack.sh 副本）
for f in "$R/scripts"/*; do
  [ -e "$f" ] && cp -r "$f" "$P/scripts/" || true
done
# 根级配置与工程文档
for f in package.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs \
         components.json tailwind.config.ts bun.lock .env .gitignore \
         AGENTS.md DECISIONS.md DEPLOY.md ENGINEERING_LOG.md KNOWN_ISSUES.md \
         PROJECT_STATE.md README.md next-env.d.ts; do
  [ -e "$R/$f" ] && cp "$R/$f" "$P/$f"
done

echo "== [3] 校验关键文件 =="
for f in package.json next.config.ts .env src/app/layout.tsx src/app/page.tsx \
         server/fishAudioHandler.js server/docReferences.js \
         scripts/db-ensure.mjs doc/knowledge-a.compact.json \
         public/snapdom.js public/row-player.html public/fonts; do
  [ -e "$P/$f" ] && echo "  OK  $f" || echo "  MISS $f"
done

echo "== [4] 数据体量 =="
du -sh "$P/var" "$P/public" "$P/doc" 2>/dev/null

echo "== [5] Caddyfile 一致性 =="
diff <(tr -d '\r' < "$P/Caddyfile") <(tr -d '\r' < "$R/Caddyfile") >/dev/null 2>&1 \
  && echo "一致，保留平台版" || { echo "不同，用仓库版覆盖"; cp "$R/Caddyfile" "$P/Caddyfile"; }

echo "== 完成 =="
