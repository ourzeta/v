# 风险矩阵

更新时间：2026-10-30（阶段一 · X-Ray 四层扫描完成后重写）。

> 风险按 P0-P3 分级；每条有证据位置、影响范围、闸门条件。**只识别，不施工**。

---

## 阻塞级风险（P0 · 立即处理）

| ID | 风险 | 证据 | 影响 | 闸门 |
|---|---|---|---|---|
| **R0-P0** | CodeGraph 未索引独立 git repo | 当前目录是独立 repo，父级 `g:\22222\workspace-ff9122222` 的 `.codegraph/` 不包含此目录 | AST 级探索不可用，只能用 ctx_search + 手动 Read | 手动在项目根执行 `codegraph init` |
| **R1-P0** | TTS API Key 硬编码在源码 | `server/fishAudioHandler.js` L18-22 三枚 `sk-fish-*` 明文 | GitHub 转私有已做，但历史 commit 里的 key 仍可见；公仓即泄露 | 轮换所有 key → git filter-repo 清洗历史 → 代码只保留 env，不再 hardcode |

## 高风险（P1 · 阶段二必处理）

| ID | 风险 | 证据 | 影响 | 闸门 |
|---|---|---|---|---|
| **R2-P1** | AgentBDirect.tsx 过度集中 | 约 3000 行，状态/effect/TTS/交付/录制同文件 | 局部微调可能破坏多阶段状态 | 先做状态/事件/API 矩阵 → 再按边界拆 |
| **R3-P1** | Check Agent 回写身份可能错配 | `src/check-agent/service.js` Check Agent 返回 rows 可能按数组索引而非 `_rowUid` 合并 | 行增删/重排后 Check 结果可能错位 | 实测 `_rowUid` 覆盖；必要时改索引匹配为身份匹配 |
| **R4-P1** | 交付路径相对契约脆弱 | `row-player.html` ↔ `board/fonts/` ↔ `board/../audio-cache/` 同构 | 任何路径改动必须跑线上+解压后双验收 | 改路径前先跑 font-single-source + ZIP offline 验收 |
| **R5-P1** | 运行时文件与源码混合 | `var/`、`public/audio-cache/`、`public/pic/`、`public/board-result/` 均在业务根目录 | cleanup 可能误删资源；git 污染 | 先确认 current + keep 集合 → 再动清理逻辑 |
| **R6-P1** | sessionId/loop 上下文修复未入错题集 | 用户报告修复了但 ENGINEERING_LOG/DECISIONS 无记录 | 下次踩同一个坑 | 补记错题集条目 |
| **R7-P1** | fetch 防篡改补丁风险 | `FETCH_GUARD_SCRIPT` 覆盖 `Object.defineProperty` 拦截 fetch | 未来引入新 SDK 或 React 新版本可能冲突 | 每次引入新依赖跑 fetch 拦截回归 |

## 中风险（P2 · 阶段二识别后再定）

| ID | 风险 | 证据 | 影响 | 闸门 |
|---|---|---|---|---|
| **R8-P2** | productionServer.js 历史死文件 | Vue 时代零引用（PROJECT_STATE 已标注） | 部署脚本/文档/外部入口需证明无依赖 | grep 全仓引用 → 无引用即删 |
| **R9-P2** | board-preview.html 兼容 shim | 与 Next `/board-preview` 并存 | 旧书签/外链/静态部署入口 | 查 HTTP access log |
| **R10-P2** | node_modules 大量依赖（900+ packages） | package.json 含 antd/radix/framer-motion/dnd-kit 等 | 冷启动慢、构建体积大 | 阶段二评估 tree-shaking + vendor split |
| **R11-P2** | 多 lockfile 冲突 | `bun.lock` + 父目录 `package-lock.json` | Turbopack workspace root 误判 | 阶段二清理外层 lockfile |
| **R12-P2** | 项目缺少 `tsconfig.json` include 覆盖的部分 JS | tsconfig 只 include `.ts/.tsx`；`server/*.js`、`src/agent-b-v2/*.js` 不参与 tsc 检查 | 类型断层 | 阶段二补 JSDoc 或转 TS |

## 低风险（P3 · 记录在案）

| ID | 风险 | 证据 |
|---|---|---|
| **R13-P3** | Node 26 runtime warnings | `module.register()` deprecated + `localStorage` experimental |
| **R14-P3** | 浏览器扩展注入 hydration mismatch | chrome-extension:// inspector.js 修改 DOM |
| **R15-P3** | 技能包归档体积大 | `doc/skills-archive/` 目录多 HTML demo |

---

## 风险处理顺序（Top 10）

1. **R1-P0** key 轮换 + 历史清洗（安全立命之本）
2. **R0-P0** codegraph init（AST 探索能力，后续所有重构的地基）
3. **R3-P1** Check Agent 行身份匹配（数据正确性）
4. **R2-P1** AgentBDirect 拆分前先建状态/API 矩阵（施工图纸）
5. **R6-P1** 错题集补记（踩坑经验固化）
6. **R5-P1** cleanup 路径确认（清理=破坏性动作）
7. **R4-P1** 交付路径契约保护（改路径双验收）
8. **R8-P2** productionServer.js 引用证明（死文件清理）
9. **R12-P2** tsc JS 断层补覆盖（类型安全延伸）
10. **R11-P2** lockfile 清理（构建稳定性）

---

## 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-10-27 | 初始 12 条风险 |
| v2.0 | 2026-10-30 | X-Ray 四层扫描后重写；P0 级新增 2 条；废弃 Prisma 层 R4 拆出；等级重排 |
