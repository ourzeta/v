# 项目初始状态与勘探快照

- **日期**：2026-10-30
- **仓库**：GitHub zo4xia/2111（已转 Private）
- **分支**：main
- **基线**：最新验收快照
- **本阶段**：阶段一，X-Ray 四层扫描完成，仅更新文档，未改业务源码

---

## 1. 项目定位

小学数学 AI 讲题视频工作台。用户上传/填写题目 → 识别题意 → 生成分步讲解/板书动作/口播稿 → 用户审核/配音 → 预览/录制/离线交付。

核心约束：**生成类操作（Agent B/TTS）只认用户点击**（D13）；**手写感由字体+rough 笔触承载，禁止逐字抖动**；**交付 ZIP 零改动播放器**。

---

## 2. 技术地基

| 层 | 实态 | 关键位置 |
|---|---|---|
| 框架 | Next.js 16.1.3 + React 19 + TypeScript 5 | `src/app/` |
| UI | Ant Design 6 + Radix UI + Tailwind 4 + shadcn | `src/components/ui/` + `src/components/teaching/` |
| 服务端 | Next Route Handlers + Node 兼容层 | `src/app/api/*/route.ts`（12 个）+ `src/server-node/compat.ts` |
| 业务 Handler | 原生 Node.js 模块 | `server/*.js`（20 个） |
| AI | Agent A 识题 / Agent B 生成 / Check Agent 审计 / Fish Audio TTS | `src/agent-b-v2/` + `src/check-agent/` + `server/fishAudioHandler.js` |
| 存储 | 文件系统 var/handoff + var/deliverable（current.json 指针 + 时间戳实体） | 业务真源 = 文件 |
| 交付 | HTML 播放器 + ZIP 离线包 + md5 manifest | `public/row-player.html` + `server/releasePackage.js` |

---

## 3. 目录四层测绘

```text
项目根 (g:\22222\workspace-ff9122222\...)
│
├── src/                              ← 业务源码（Next.js App Router）
│   ├── app/                          ← 页面 + API Routes
│   │   ├── page.tsx                  工作台主页（step1 ↔ agent-b 二态）
│   │   ├── layout.tsx                根布局（fetch 防篡改 + 字体宪法）
│   │   ├── board-preview/page.tsx    板书预览页
│   │   ├── deliverable/[[...name]]   交付物静态服务（KI-034 路径穿越已修）
│   │   ├── handoff/[name]            交接档静态服务
│   │   └── api/                      12 个 API Route Handlers
│   │       ├── agent-b-v2/generate   Agent B 五字段生成
│   │       ├── recognition/problem   Agent A 识题（图/文双通道）
│   │       ├── deliverable/...       交付物读写 + ZIP export
│   │       ├── handoff/...           交接档读写
│   │       ├── tts/...               Fish Audio 语音合成
│   │       ├── check-agent/check     Check Agent 五字段审计
│   │       ├── check-agent/apply     应用 Check Agent 修正
│   │       ├── knowledge/...         知识点修缮（refine → apply 两阶段）
│   │       ├── screenshot            截图存储
│   │       ├── asset/...             静态资源服务
│   │       ├── cleanup               清理过期生成物
│   │       └── health                健康检查
│   │
│   ├── components/teaching/          ← 主业务 UI
│   │   ├── AgentBDirect.tsx          ★ 核心组件（~3000 行，待拆）
│   │   ├── BoardPreviewApp.tsx       板书预览
│   │   ├── Step1Entry.tsx            第1步识题入口
│   │   ├── BoardContentLayer.tsx     板书内容层
│   │   ├── RealBoardPreview.tsx      真实板书预览
│   │   ├── agentb/                   Agent B 弹窗子组件
│   │   │   ├── AgentBShared.ts       常量/纯函数共享模块
│   │   │   ├── ToolsCard.tsx         工具卡片
│   │   │   ├── DeliverableModal.tsx  交付成功弹窗
│   │   │   ├── CheckResultModal.tsx  Check Agent 结果弹窗
│   │   │   ├── ApiConfigModal.tsx    用户配置弹窗
│   │   │   ├── KnowledgeDetailModal  知识点详情
│   │   │   └── RefineCompareModal   修缮对比
│   │   └── GlobalPulseLoading等      加载动画等
│   │
│   ├── agent-b-v2/                   ← Agent B 业务核心
│   │   ├── prompt.js                 ★ 系统提示词（7,716 字符，规则+示例成对）
│   │   ├── contract.js               五字段输出契约 + normalize
│   │   ├── service.js                客户端 generateAgentBV2Rows
│   │   ├── timing.js                 字数分档时长 + computeRowGroupTimeline
│   │   ├── knowledgeRefinePrompt     知识点修缮提示词
│   │   ├── composables/useBCache     B 层缓存
│   │   └── skills/                   技能包（liyongle-elementary 等）
│   │
│   ├── check-agent/                  ← Check Agent 审计链
│   │   ├── prompt.js                 系统提示词
│   │   ├── service.js                checkAgentRows / polishLocally
│   │   ├── skillViolations.js        ★ 5 skill 反模式校验
│   │   └── asrPolish.js              本地即时 ASR 润色
│   │
│   ├── board-tools/                  ← 板书动作工具
│   │   ├── roughNotationTool.js      ★ underline/circle only（已收白名单）
│   │   ├── boardToolCatalog.js       工具目录（仅 rough-notation）
│   │   ├── boardToolTiming.js        MIN_HAND_LIFT_GAP_MS / 字数分档真源
│   │   ├── boardAnchorCore.js        锚点核心
│   │   ├── handActionScheduler       手势调度
│   │   ├── stableHash.js             稳定哈希
│   │   └── textTargetRegistry        文本目标注册
│   │
│   ├── services/                     ← 业务服务层
│   │   ├── stepHandoff.js            ★ 画布参数唯一真源
│   │   ├── recognitionClient.js      识题客户端
│   │   ├── globalLoading.js          全局 Loading
│   │   ├── stepHandoff.js            handoff 构造
│   │   └── agentAKnowledge.js         Agent A 知识
│   │
│   ├── utils/                        ← 工具层
│   │   ├── boardLayout.js            ★ DEFAULT_BOARD_PLAN 四区布局真源
│   │   ├── canvasCoords.js           画布坐标
│   │   ├── canvasText.js             画布文本绘制
│   │   ├── superFilter.js            HTML 渲染过滤器
│   │   ├── mathText.js               数学文本处理
│   │   └── board-doctrine.js         板书教义
│   │
│   ├── lib/                          ← 配置 + 工具库
│   │   ├── agentBApiConfig.js         Agent B 独立 API 配置
│   │   ├── checkAgentApiConfig.js     Check Agent 独立配置
│   │   ├── userApiConfig.js           Agent A 识题配置
│   │   ├── parseLLMJson.js            ★ 安全 JSON 解析唯一真源
│   │   ├── safeJsonFetch.js           安全 fetch
│   │   ├── mathAsrConverter.js        数学 ASR → 中文口播
│   │   ├── deliverableAssetPaths.js   交付物资产路径
│   │   └── vueShim.js                Vue reactive 桥（D2 保留）
│   │
│   ├── components/ui/                ← shadcn 55 个 UI 组件
│   └── hooks/                        ← use-mobile, use-toast
│
├── server/                           ← Node.js 业务 Handler（20 个）
│   ├── http.js                       ★ 唯一真源 HTTP 工具（fetch/credentials/JSON）
│   ├── agentBV2Handler.js            Agent B 五字段生成（HANDOFF_TEXT_FIELDS 白名单）
│   ├── recognitionHandler.js         Agent A 识题（图/文双通道）
│   ├── checkAgentHandler.js          Check Agent 审计
│   ├── fishAudioHandler.js           TTS（3 key 轮询 + forceRefresh 破缓存）
│   ├── deliverableStoreHandler.js    交付物存储 + ZIP export + companion 自愈
│   ├── handoffStoreHandler.js        交接档存储
│   ├── knowledgeRefineHandler.js     知识点修缮（refine → apply 两阶段）
│   ├── boardResultStore.js           板书结果存储
│   ├── screenshotStoreHandler.js     截图存储
│   ├── cleanupHandler.js             清理（解引 current + 保活 48h audio-cache）
│   ├── releasePackage.js             ★ 交付包组装器（资源+md5+manifest+README）
│   ├── renderDeliverableHtml.js      companion HTML 渲染
│   ├── docReferences.js              文档引用
│   ├── recognitionPrompt.js          识题提示词
│   ├── agentAKnowledge.js             Agent A 知识库
│   ├── loadDotEnv.js                 .env 加载
│   └── productionServer.js           ★ Vue 时代死文件（KI-005）
│
├── public/                           ← 静态资源
│   ├── row-player.html               ★ 播放页真身（已含行间 1s 停顿）
│   ├── board-preview.html            兼容 shim（KI-006）
│   ├── board-result/                 历史板书结果
│   ├── audio-cache/                  TTS 合成产物（md5.mp3）
│   ├── fonts/board-local.css         本地字体注册（栗壳+韶华双注册名）
│   └── skills-hub/                   Skills 聚合页
│
├── var/                              ← 运行时档案
│   ├── deliverable/                  交付档（current.json + 时间戳实体 + companion HTML）
│   └── handoff/                      交接档（current.json + 时间戳实体）
│
├── db/custom.db                      ★ Prisma 已拆但平台契约需此文件（零依赖桩）
├── doc/                              ← 项目文档 + skills archive
└── scripts/                          ← 测试脚本 12+（test-*.mjs）

---

## 4. 核心业务流 Mermaid

```mermaid
flowchart TD
    subgraph 用户输入层
        U1[/填写题目文本/]
        U2[/上传题目图片/]
        U3[/用户配置弹窗<br>（Agent A/B/Check 三独立 key）/]
    end

    subgraph Step1 识题层
        U1 -->|POST /api/recognition/problem| A1[recognitionHandler.js<br>图/文双通道]
        U2 --> A1
        U3 -->|resolveUserCredentials| A1
        A1 -->|LLM 外呼 + doc/knowledge-a.compact.json| A2[/识别结果<br>problemType/imageKind/boardFocus/]
        A2 -->|POST /api/handoff| A3[handoffStoreHandler<br>→ var/handoff/current.json]
    end

    subgraph Agent B 生成层（D13：只认用户点击）
        A3 -->|POST /api/agent-b-v2/generate| B1[agentBV2Handler<br>HANDOFF_TEXT_FIELDS 白名单过滤]
        B1 -->|LLM 外呼 + parseLLMJson 软降级| B2[/五字段 rows<br>stage/speech/board/board_timing/actionSpec/]
        B2 -->|normalizeAgentBV2BoardCells| B3[白名单过滤<br>underline/circle only]
        B3 -->|用户在 AgentBDirect.tsx 编辑改稿| B4[/编辑后 rows/]
    end

    subgraph Check Agent 审计层
        B4 -->|POST /api/check-agent/check| C1[checkAgentHandler]
        C1 -->|LLM 外呼 + skillViolations 5 红线| C2[/审计报告<br>changes + violations/]
        C2 -->|用户点"应用修正"| C3[POST /api/check-agent/apply]
    end

    subgraph TTS 语音合成层（D13：只认用户点击）
        C3 -->|用户点"一键语音"| T1[/POST /api/tts/batch<br>并发=3 对齐 key 轮询/]
        B4 -->|用户点行内小喇叭| T2[/POST /api/tts/synthesize/]
        T1 -->|Fish Audio API<br>3 key 轮换 + forceRefresh 破缓存| T3[/audio-cache/md5.mp3?v=ts/]
        T2 --> T3
        T3 -->|setRowAudioUrl 三写同步| T4[/回填 rows.audioUrl/]
    end

    subgraph 交付与录制层
        T4 -->|POST /api/deliverable| D1[deliverableStoreHandler<br>→ var/deliverable/current.json]
        D1 -->|GET /api/deliverable| D2[/预览 BoardPreviewApp.tsx/]
        D1 -->|GET /api/deliverable/export| D3[releasePackage.js<br>ZIP: board/fonts/+audio-cache/+pic/+manifest]
        D3 -->|解压双击| D4[/离线播放 row-player.html/]
        T4 -->|getDisplayMedia| D5[/录制 webm + 文字指引 MP4/]
    end

    style A3 fill:#4ade80,stroke:#16a34a
    style B1 fill:#60a5fa,stroke:#2563eb
    style C1 fill:#fbbf24,stroke:#d97706
    style T1 fill:#f472b6,stroke:#db2777
    style D1 fill:#a78bfa,stroke:#7c3aed
```

---

## 5. 数据流宪法（夏夏纠偏 2026-10-26）

1. **handoff** = 第 1 步交给 Agent B 的题目信息交接物（与 row 无关）
2. **rows** = 生于 Agent B 按契约的生成环节
3. **row.audioUrl 唯一写入口** = `setRowAudioUrl`（真源 + rowAudioCache + bCache 三写同步）
4. **交付档序列化 audioUrl → mp3**；lite player 音频驱动逐行连播
5. **生成类操作只认用户点击**（D13）：任何 useEffect/完成点/恢复点自动触发 = 违宪
6. **重新生成同文本 = forceRefresh 重合成 + `?v=<ts>` 版本参数破浏览器缓存**（D14）
7. **白名单收敛**：板书动作只许 underline/circle；highlight/rough-line 已废止

---

## 6. 12 个 API Routes 一览

| # | Route | Method | Handler | 外呼 | 读写 | [TAG:ROUTE] |
|---|---|---|---|---|---|---|
| 1 | `/api/health` | GET | - | 无 | - | ✅ |
| 2 | `/api/recognition/problem` | POST | recognitionHandler | LLM 识题(110s) | doc/knowledge-a.compact.json | ✅ |
| 3 | `/api/agent-b-v2/generate` | POST | agentBV2Handler | LLM 生成 rows | public/board-result | ✅ |
| 4 | `/api/check-agent/check` | POST | checkAgentHandler | LLM 审计(25s) | board-result + var/handoff | ✅ |
| 5 | `/api/check-agent/apply` | POST | checkAgentHandler | 无 | - | ✅ |
| 6 | `/api/handoff/[action]` | GET/POST | handoffStoreHandler | 无 | var/handoff | ✅ |
| 7 | `/api/deliverable/[action]` | GET/POST | deliverableStoreHandler | 无 | var/deliverable + public/* | ✅ |
| 8 | `/api/tts/[action]` | GET/POST | fishAudioHandler | api.fish.audio(3key轮询) | public/audio-cache | ✅ |
| 9 | `/api/knowledge/[action]` | POST | knowledgeRefineHandler | LLM 修缮(60s) | var/handoff | ✅ |
| 10 | `/api/screenshot` | POST | screenshotStoreHandler | 无 | public/pic | - |
| 11 | `/api/asset/[...path]` | GET | - | 无 | public/ | - |
| 12 | `/api/cleanup` | POST | cleanupHandler | 无 | public/*4 + var/2 | ✅ |

> **好消息**：每个 route.ts 都有 `[TAG:ROUTE]` 标签注释，标明 method/handler/外呼/读写路径——**核心路由打点做到位了！**

---

## 7. 技术栈版本健康度

| 依赖 | 版本 | 状态 |
|---|---|---|
| Next.js | 16.1.3 | 最新（v16 breaking changes 需注意） |
| React | 19 | 最新 |
| TypeScript | 5.x | 最新 |
| Ant Design | 6.6.7 | 最新（Descriptions 布局已变） |
| Tailwind | 4 | 最新（v4 新架构） |
| dnd-kit | 6/10/3（三包） | 正常 |
| jszip | 3.10.2 | 正常 |
| Prisma | 已拆除 | ✅ 死基建已清理 |
| ESLint | 9 + config-next 16.1.1 | 正常 |

---

## 8. 未做 + 接力棒

| # | 事项 | 原因 | 接力方 |
|---|---|---|---|
| 1 | 浏览器真实端到端验链 | ctx_search + Read 只证明源码逻辑通 | 夏夏刷新 http://localhost:3000 |
| 2 | codegraph init | 独立 git repo 未建 AST 索引 | 部署前执行一次 |
| 3 | Prisma 零覆盖区 tsc | `tsconfig.json` exclude server/ + src/agent-b-v2/*.js | 阶段二补 JSDoc 或转 TS |
| 4 | Check Agent 行身份合并 | service.js 可能按数组索引 | 实测 `_rowUid` 覆盖 |
| 5 | sessionId/loop 上下文错题集补记 | 用户报告修复但无记录 | 立即补记 |
| 6 | 真实 TTS 首字试听 | forceRefresh + ?v= 修复需现场 | 夏夏现场验证 |
| 7 | 部署验证 | 平台 build 隔离复现已全绿 | 部署机实测 |

---

*本文件 = 阶段一勘探产物，作为阶段二诊断的唯一输入基线。*
