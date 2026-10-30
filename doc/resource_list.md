# 可复用资源清单
 
更新时间：2026-10-30（阶段一 · X-Ray 四层扫描完成后重写）。

> 用途：阶段二施工前，优先复用现有资源，避免新增重复实现。原则是「能 import 就不重写」。

---

## 一、核心骨架层（零动即破契约）

| # | 资源 | 位置 | 复用方式 | 约束 |
|---|---|---|---|---|
| 1 | **Next Route Handler 入口** | `src/app/api/*/route.ts`（12 个） | 复用现有 URL + compat 层 | 不重复创建同义 API；所有 route 带 `[TAG:ROUTE]` 标签 |
| 2 | **Node 兼容层** | `src/server-node/compat.ts` | 统一 Next Request ↔ Node http handler 适配 | 不在页面内直连 handler |
| 3 | **画布参数唯一真源** | `src/services/stepHandoff.js` | CANVAS_SIZE 1726×980 / QUESTION_FONT 30px / BOARD_FONT 40px / 字体宪法 v2.4 | 禁止手写字面量；发现硬编码 = bug |
| 4 | **四区布局唯一真源** | `src/utils/boardLayout.js` | DEFAULT_BOARD_PLAN 派生（消灭 7 处手抄副本） | 任何 fallback 一律 import，禁止手写数字 |
| 5 | **字体宪法 v2.4** | `public/fonts/board-local.css` | 栗壳坚坚体(默认)/乔木/韶华 三选一 + 降级栈 | ZIP 内 fonts/ 与 html 同级硬契约 |

## 二、业务服务层（调用即生效）

| # | 资源 | 位置 | 复用方式 | 约束 |
|---|---|---|---|---|
| 6 | **Agent B 契约** | `src/agent-b-v2/contract.js` | normalizeAgentBV2BoardCells / parseAgentBV2Response | 修改前先确认 3+ 调用者 |
| 7 | **Agent B 服务** | `src/agent-b-v2/service.js` | generateAgentBV2Rows / applyAgentBV2Timeline | 不在 UI 重写 prompt 解析 |
| 8 | **Agent B 提示词** | `src/agent-b-v2/prompt.js` | 开场/收尾独立成行（D15） | 规则+示例必须成对修改 |
| 9 | **Check Agent 服务** | `src/check-agent/service.js` | checkAgentRows / polishLocally | 检查和应用是两个明确动作 |
| 10 | **Check Agent 技能红线** | `src/check-agent/skillViolations.js` | 5 skill 反模式（坐标越界/字体越权/工具白名单/口播硬规范/字面落板禁令） | 只做检测不做修复 |
| 11 | **板书动作白名单** | `src/board-tools/roughNotationTool.js` | underline / circle only，颜色 #dc2626 | highlight/rough-line 已废止不可回 |
| 12 | **音频真源链** | `setRowAudioUrl`（AgentBDirect 内） | 唯一 audioUrl 写入口 = 真源 + rowAudioCache + bCache 三写同步 | 重新生成用 forceRefresh + `?v=<ts>` 破缓存（D14） |
| 13 | **知识修缮链** | `src/agent-b-v2/knowledgeRefinePrompt.js` + `server/knowledgeRefineHandler.js` | refine 出提案不落盘 → /apply 才写入活档 | B 与 Check 永不分叉（R8-① A 方案） |

## 三、存储与交付层

| # | 资源 | 位置 | 复用方式 | 约束 |
|---|---|---|---|---|
| 14 | **交付组装器** | `server/releasePackage.js` | 资源收集 + md5 + README + manifest | manifest 不含自身；缺失资源进 missing 如实披露 |
| 15 | **companion HTML 自愈** | `server/deliverableStoreHandler.js` | 模板 mtime > companion mtime → 自动重渲染 | 修复 D11 字体本地化后旧固化件坏象 |
| 16 | **播放器** | `public/row-player.html` | 线上与 ZIP 共用（相对路径契约） | ZIP 内 board/ + audio-cache/ 同级命中，零改动 |
| 17 | **运行时档案** | `var/handoff/`、`var/deliverable/` | current.json 指针 + 时间戳实体 | cleanup 必须解引 current 和资产引用 |
| 18 | **清理器** | `server/cleanupHandler.js` | 先归一 action → 再解引用 → 最后清理过期档 | KI-035 keep 集合按 current 指针算 |
| 19 | **路径穿越双层防线** | `src/app/deliverable/[[...name]]/route.ts` / `src/app/api/asset/[...path]/route.ts` | 逐段校验 + resolve 后强校验必须在 baseDir 内 | KI-034 已修，同款逻辑两处复用 |

## 四、安全与解析

| # | 资源 | 位置 | 复用方式 | 约束 |
|---|---|---|---|---|
| 20 | **安全 JSON 解析** | `src/lib/parseLLMJson.js` | 唯一真源（JSON / ```json / 嵌套对象全兼容） | agentBV2Handler/knowledgeRefineHandler/其他 4+ 处共用 |
| 21 | **fetch 防篡改补丁** | `src/app/layout.tsx` FETCH_GUARD_SCRIPT | 守卫 Object.defineProperty 对 fetch 的拦截 | 必须先于一切业务代码执行 |
| 22 | **userApiConfig 三配置** | `src/lib/userApiConfig.js` / `agentBApiConfig.js` / `checkAgentApiConfig.js` | 前端弹窗配置 → 服务端 resolveUserCredentials 取快照 | 3 枚 key 分离：用户/Agent B/Check Agent |

## 五、测试与验证

| # | 资源 | 位置 | 复用方式 |
|---|---|---|---|
| 23 | **回归脚本 10+** | `scripts/test-*.mjs` | 清理契约/行ID稳定性/数学一致性/提示词洁净度/动作白名单/字体/speechMarkdown |
| 24 | **font-single-source 哨兵** | (test-font-single-source) | HANDWRITING_FONT_STACK noWs 压缩比对锁死，改栈先跑哨兵 |
| 25 | **路径穿越烟测** | (agentb-ui-20261030) | `GET /deliverable/..%2F..%2Fpackage.json` 必须 404 |

## 六、已确认废弃/拆除（禁止再引）

| # | 废弃项 | 原因 | 状态 |
|---|---|---|---|
| - | Prisma 层（prisma/schema.prisma + src/lib/db.ts） | 零活引用，业务真源 = var/ + public/ | **已拆除**（KI-004 2026-10-30） |
| - | rough-line / old roughDrawingTool | 动作白名单收敛为 underline/circle | 已删 |
| - | highlight 板书动作 | 夏夏「其他做我怕做不好」 | 已删 |
| - | 自动语音 hook（生成完成点/缓存恢复点） | D13 生成类操作只认用户点击 | 已拆（原地留碑注释） |
| - | 板书随机抖动（字号/基线/字距/位置/逐字旋转/整行微倾） | 手写感由手写字体 + rough 笔触承载 | 已归零退役 |

---

*本文档 = 可复用资源唯一清单。施工时对照上表，能 import 就不重写。*
