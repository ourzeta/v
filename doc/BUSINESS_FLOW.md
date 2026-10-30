# 业务流图谱（指南针文档）

> 本文档是项目的**阵列图**：全链通路、数据流、API 映射、测试图谱一图在手。
> 维护铁律：**改路由/改存储/改业务流，必须同步改本文档**——不同步等于没改。
> 快速拉脉络：`rg "\[TAG:" src/ server/` 可一键抽出全部业务线埋点。
> 最近校验：2026-10-30（三路 Agent 全链勘探 + 11 项测试全 PASS + 穿越/防误杀实测）。

---

## 0. 架构总览

```mermaid
graph TB
    subgraph 前端["前端 · 浏览器（src/components/teaching/）"]
        UI1[Step1Entry 上传识别]
        UI2[AgentBDirect 五字段工作台]
        UI3[BoardPreviewApp 画布预览]
        CFG[Agent 配置抽屉<br/>localStorage 持久化]
    end

    subgraph 路由层["Next.js 16 App Router（src/app/）"]
        R1["/api/* 路由壳 12 条<br/>[TAG:ROUTE] 埋点"]
        BR["compat.ts 桥<br/>[TAG:BRIDGE]<br/>Web Request → Node req/res"]
        R2["静态服务 3 条<br/>/handoff/* /deliverable/* /board-preview"]
    end

    subgraph 业务层["server/*.js 业务 handler（20 个，standalone 全 trace）"]
        H1[recognitionHandler 识别]
        H2[agentBV2Handler 分镜生成]
        H3[checkAgentHandler 审校]
        H4[fishAudioHandler TTS]
        H5[deliverableStoreHandler 交付]
        H6[handoffStoreHandler 交接档]
        H7[knowledgeRefineHandler 知识修缮]
        H8[cleanupHandler 清理]
    end

    subgraph 真源["数据真源 = 文件系统（无数据库，Prisma 已拆除 KI-004）"]
        D1["var/handoff/<br/>交接档 + current.json 指针"]
        D2["var/deliverable/<br/>交付 JSON/HTML + current 指针"]
        D3["public/board-result/<br/>分镜执行表"]
        D4["public/audio-cache/<br/>TTS 音频 md5 命名"]
        D5["public/pic/<br/>题目截图"]
        D6["doc/knowledge-a.compact.json<br/>领域知识库"]
    end

    EXT1["用户配置的 LLM endpoint<br/>(识别/生成/审校/修缮)"]
    EXT2["api.fish.audio<br/>TTS 合成（3 key 轮询）"]

    UI1 & UI2 & UI3 --> R1
    R1 --> BR --> H1 & H2 & H3 & H4 & H5 & H6 & H7 & H8
    R2 --> D1 & D2
    H1 --> D6
    H1 & H2 & H3 & H7 --> EXT1
    H4 --> EXT2
    H2 --> D3
    H3 --> D3
    H4 --> D4
    H5 --> D2
    H6 --> D1
    H8 -.清理.-> D1 & D2 & D3 & D4 & D5
    CFG -.供密钥.-> EXT1
```

## 1. 黄金路径时序（三步出片）

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户(老师)
    participant FE as 工作台前端
    participant API as Next 路由层
    participant SRV as server/*.js
    participant FS as 文件系统真源
    participant LLM as 用户配置 LLM
    participant TTS as api.fish.audio

    rect rgb(235,245,255)
    Note over U,FS: 第 1 步 · 上传与识别
    U->>FE: 拍照/上传题目图
    FE->>API: POST /api/screenshot
    API->>SRV: screenshotStoreHandler
    SRV->>FS: 写 public/pic/shot-*.jpg
    FE->>API: POST /api/recognition/problem
    API->>SRV: recognitionHandler(110s超时)
    SRV->>FS: 读 doc/knowledge-a.compact.json
    SRV->>LLM: 多模态识别 + 知识检索
    SRV-->>FE: 题干文本 + 知识点 + 板书布局预览
    FE->>API: POST /api/handoff
    API->>FS: 写 var/handoff/handoff-*.json(交接档)
    end

    rect rgb(235,255,235)
    Note over U,FS: 第 2 步 · 生成执行表(五字段分镜)
    U->>FE: 点「生成」
    FE->>API: POST /api/agent-b-v2/generate
    API->>SRV: agentBV2Handler(OpenAI/Anthropic双协议)
    SRV->>LLM: system+user 单轮(失败重试≤2 同请求内)
    SRV->>FS: 写 public/board-result/board-result-*.json
    SRV-->>FE: rows[五字段: 环节/口播稿/板书/动作/时长]
    opt 审校(可选)
        FE->>API: POST /api/check-agent/check(25s超时)
        API->>SRV: checkAgentHandler(失败降级本地ASR)
        SRV-->>FE: 修正建议 changes[]
        FE->>API: POST /api/check-agent/apply
        API->>FS: 原地覆写 board-result 当前档
    end
    end

    rect rgb(255,245,235)
    Note over U,TTS: 第 3 步 · 配音与交付
    loop 每缺音频的行(并发3)
        FE->>API: POST /api/tts/synthesize
        API->>SRV: fishAudioHandler(key轮询)
        SRV->>TTS: POST /v1/tts(⚠无超时 KI-039)
        SRV->>FS: 写 public/audio-cache/<md5>.mp3
    end
    U->>FE: 点「生成交付单页」
    FE->>API: POST /api/deliverable
    API->>FS: 写 var/deliverable/deliverable-*.{json,html}
    FE->>API: GET /api/deliverable/export
    API->>FS: 打包 ZIP(音频/题图/清单 md5)
    U->>FE: 打开交付页 → 播放/批注/录制 → WebM 讲题视频
    end
```

## 2. 数据流图（字段 → 目录归属）

```mermaid
flowchart LR
    subgraph 请求字段
        F1["imageDataUrl / problemText"]
        F2["handoff{题目,知识点,画布}"]
        F3["rows[五字段]"]
        F4["text(口播稿)"]
        F5["imageBase64(截图)"]
    end
    subgraph 落盘产物
        P1["public/pic/shot-*.jpg"]
        P2["var/handoff/*.json<br/>current.json 指针"]
        P3["public/board-result/*.json<br/>current.json 指针"]
        P4["public/audio-cache/<md5>.mp3<br/>public/audio/row-*.mp3"]
        P5["var/deliverable/*.{json,html}"]
    end
    F5 --> P1
    F1 -.识别时引用.-> P1
    F2 --> P2
    F2 -->|生成消费| P3
    F3 --> P3
    F4 --> P4
    P3 -->|交付时序列化| P5
    P4 -.相对路径引用.- P5
    P1 -.相对路径引用.- P5
```

**指针约定**：`current.json` 存 `{projectCode, filename, createdAt}`，各读取端解析指针后回读实体档；指针失效时各 store 自愈重建（GET 带幂等写，见 KI 已知项）。

## 3. API 通路映射表（12+2 条，全链实测 2026-10-30）

| 路由 | 方法/action | handler | 读写 | 外呼 | 状态 |
|---|---|---|---|---|---|
| `/api/health` | GET | 内联 | 无 | 无 | ✓ |
| `/api/recognition/problem` | POST | recognitionHandler | 读 doc/ 知识库 | 用户 LLM(110s) | ✓ |
| `/api/screenshot` | POST | screenshotStoreHandler | 写 public/pic | 无 | ⚠GET 死分支 |
| `/api/agent-b-v2/generate` | POST | agentBV2Handler | 写 board-result | 用户 LLM(90s/300s) | ✓ |
| `/api/check-agent/check` | POST | checkAgentHandler | 读 board-result+handoff | 用户 LLM(25s) | ✓ |
| `/api/check-agent/apply` | POST | checkAgentHandler | 覆写 board-result | 无 | ✓ |
| `/api/tts/[[...action]]` | GET info; POST synthesize/save-local/batch | fishAudioHandler | 写 audio-cache | api.fish.audio ⚠无超时 | ⚠GET /api/tts 404 |
| `/api/knowledge/[action]` | POST refine/apply | knowledgeRefineHandler | 读写 var/handoff | 用户 LLM(60s) | ✓ |
| `/api/handoff/[[...action]]` | GET; POST | handoffStoreHandler | 读写 var/handoff | 无 | ✓ |
| `/api/deliverable/[[...action]]` | GET //list/export; POST /update-* | deliverableStoreHandler | 读写 var/deliverable | 无 | ✓ ⚠list/batch 死端点 |
| `/api/asset/[...path]` | GET/HEAD | 内联 | 读 public/ 4 目录 | 无 | ✓ 双层防穿越 |
| `/api/cleanup` | POST | cleanupHandler | 删 6 目录过期物 | 无 | ⚠破坏性 KI-039 |
| `/handoff/:name` | GET | 内联+store | 读 var/handoff | 无 | ✓ **KI-034 已修** |
| `/deliverable/:name` | GET | 内联+store | 读 var/deliverable+fonts | 无 | ✓ **KI-034 已修** |

> 前端可疑点（12 处 fetch 无超时、静默吞错、双真源等）明细见 `KNOWN_ISSUES.md` KI-036/KI-038/KI-039 与 `doc/AGENT_PLAYBOOK.md`。

## 4. 测试图谱（11 项，2026-10-30 全 PASS）

| 测试 | 盯什么业务契约 | 跑法 |
|---|---|---|
| test-math-consistency | 数学板书/口播一致性（3/4×20→4分之3乘以20） | node |
| test-prompt-cleanliness | 提示词样例+附录哈希钉死（附录已白名单化） | node |
| test-action-whitelist | 板书动作白名单（仅 underline/circle） | **bun** |
| test-check-teaching | Check 教风铁律/挤行/降级链 | **bun** |
| test-question-font / -player | 题目字体 30px 铁律（工作台+播放页+离线导出） | node / **bun** |
| test-row-player-gap | 行间 1s 停顿（KI-021） | node |
| test-row-uid-stability | 行身份 _rowUid + TTS 竞态 | node |
| test-cleanup-contract | 清理保活契约（tmp 沙箱） | node |
| test-deliverable-fonts | 字体服务+穿越拒绝（**含 KI-034 顶层穿越回归**） | node |
| test-handoff-route | **新增** handoff 特例+穿越回归（KI-034） | node |

```mermaid
graph LR
    subgraph 业务线覆盖
        A[识别]:::gap
        B[分镜生成]:::part
        C[审校 Check]:::ok
        D[TTS 合成]:::gap
        E[交付导出]:::ok
        F[播放]:::ok
        G[录制]:::gap
        H[清理]:::ok
    end
    classDef gap fill:#fdd,stroke:#c00
    classDef part fill:#ffd,stroke:#b80
    classDef ok fill:#dfd,stroke:#0a0
```

**红区缺口（下轮测试补位方向）**：识别 prompt 构建（纯函数可测）、TTS 服务端契约（假上游桩）、录制链路（浏览器侧，需 e2e）。

## 5. 运行形态速查

| 形态 | 启动 | cwd | 写盘指向 |
|---|---|---|---|
| 沙箱生产（本仓正路） | `bash scripts/prod-serve.sh`（dev/start 同） | `.next/standalone` | 软链直连项目真身 var/doc/public×4 |
| 本机 dev | `bun run dev:next` | 项目根 | 同目录直写 |
| 发布部署 | `node server.js`（release 包内） | 包内 standalone | 包内目录（首次为快照副本） |

> 沙箱进程保活：`python3 scripts/daemonize_prod.py start|status|stop`（双 fork 脱离会话，见 AGENT_PLAYBOOK 第 1 条）。
