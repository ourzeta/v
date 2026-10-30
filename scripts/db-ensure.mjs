#!/usr/bin/env node
// ★ KI-004 止血桩（2026-10-30）：Prisma 死基建拆除后的 db:push 契约实现
// ------------------------------------------------------------------
// 为什么存在：
//   平台链 .zscripts/dev.sh 与 .zscripts/build.sh → database-runtime-build.sh
//   都在 set -e 下调用 `bun run db:push`，且后者末尾强校验
//   "DATABASE_URL 指向的 db 文件必须存在"。直接删掉 prisma 会让平台
//   重建/发布链硬炸。本桩以零依赖方式顶住同一契约：
//   → 确保 DATABASE_URL（或默认 db/custom.db）指向的 SQLite 文件存在。
//
// 语义：
//   - 文件已存在 → 什么都不做（幂等）
//   - 不存在 → mkdir -p 父目录 + touch 空文件（0 字节 = SQLite 合法空库）
//   - 无任何 ORM 行为；业务真实数据源是 var/ 与 public/（文件即数据库）
//
// 已知行为（预期，非遗漏）：
//   平台重置后 dev.sh 会经本桩重新生成空的 db/custom.db —— 空文件，
//   无消费方，属平台契约产物，勿当成 Prisma 死灰复燃。
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function targetFromEnv() {
  const raw = process.env.DATABASE_URL || 'file:db/custom.db'
  const p = raw.startsWith('file:') ? raw.slice(5) : raw
  return resolve(process.cwd(), p)
}

const target = targetFromEnv()
if (!existsSync(target)) {
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, '') // 0 字节空 SQLite
  console.log(`[db-ensure] 已创建空数据库文件: ${target}`)
} else {
  console.log(`[db-ensure] 数据库文件在位: ${target}`)
}
