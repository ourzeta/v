# KNOWN_ISSUES — 已知问题

更新时间：2026-10-30。问题按证据记录；未验证项不标记为已修复。

## KI-001 状态更新 · lint 入口已复通，历史问题关闭（2026-10-30）

- 本机 bun 入口下 `bun run lint` 正常执行并返回真实结果（非命令不可用）。
- 现存 7 条真实源码错误集中 React hooks 规则，已另立 **KI-036** 追踪；KI-001 降级为历史环境问题，关闭。

## KI-004 状态更新 · Prisma 死基建已拆除（2026-10-30）

- 证据：全仓 `@/lib/db` 与 `@prisma/client` 零活引用（源码 rg 验证）；bun.lock 零 prisma 引用；node_modules 孤儿目录已物理清除。
- 拆除物：`prisma/`、`src/lib/db.ts`、`db/custom.db`、package.json 四条 db:* 脚本、.env DATABASE_URL。
- 平台契约保命：`.zscripts/{dev,build}.sh → database-runtime-build.sh` 在 set -e 下依赖 `bun run db:push` 且末尾强校验 db 文件存在——已用零依赖契约桩 `scripts/db-ensure.mjs` 顶住（幂等，确保 SQLite 文件在位；平台重置后重建空 db/custom.db 属预期）。
- 同款清理：`scripts/restore-from-repo.sh` 同步移除 prisma/db 复制与校验项。
- 回归：重建后 11 项测试全 PASS，验收链全绿。

## KI-002 · provider credential 仍在服务端代码路径

- 位置：`server/fishAudioHandler.js`。
- 风险：凭据泄露、公开仓库历史污染、轮换不可控。
- 当前处理：不在文档中记录具体值；阶段二建立轮换和历史清理方案。
- **2026-10-30 状态更新**：GitHub 备份时发现目标仓库 zo4xia/2111 原为**公有**，而 .env 与内置密钥均在 git 树内——已先转私有再推送（可逆）。**公开回去的前置条件：密钥轮换 + git 历史清洗（git filter-repo）双完成**。

## KI-003 · AgentBDirect 过度集中

- 位置：`src/components/teaching/AgentBDirect.tsx`。
- 风险：局部微调可能破坏生成、检查、TTS、交付和录制状态。
- 当前处理：先建立状态、事件、API 矩阵，不直接按行数拆分。

## KI-004 · Prisma 模型与主业务存储不一致（已拆除，见顶部状态更新 2026-10-30）

- 位置：`prisma/schema.prisma`、`src/lib/db.ts`（均已删除）。
- 风险：保留无效层、误删仍在用的调用，或维护者误判数据真源。
- 当前处理：阶段二追踪真实调用链。→ 已完成：零活引用实证后整层拆除，业务真源 = var/ + public/（文件即数据库）。

## KI-005 · Vue 时代服务端文件疑似死文件

- 位置：`server/productionServer.js`。
- 风险：直接删除可能破坏部署脚本或外部入口。
- 当前处理：先做仓库引用、脚本、文档和运行入口证明。

## KI-006 · 兼容页面不能按重复代码直接删除

- 位置：`public/board-preview.html`。
- 风险：旧书签、外部链接或静态部署入口仍依赖。
- 当前处理：确认 shim 触发范围和替代路径后再裁决。

## KI-007 · CodeGraph MCP 本轮不可用

- 现象：调用返回 `Transport closed`。
- 当前判断：本轮调用图不完整。
- 当前处理：使用 context-mode、rg 和精确源码扫描；结论标注证据边界。

## KI-008 · 运行时资源与源码混合

- 位置：`var/`、`public/audio-cache/`、`public/pic/`。
- 风险：清理、打包、版本控制互相影响。
- 当前处理：阶段二梳理生成、引用、清理、交付四条链。

## KI-009 · 多 lockfile 导致 Next workspace root warning

- 现象：启动时检测父目录 `G:\22222\workspace-ff9122222\package-lock.json`，同时发现项目 `bun.lock`。
- 影响：当前不阻断启动，但 Turbopack workspace root 可能与项目目录不一致。
- 处理：先保留现状，阶段二确认父目录 lockfile 归属；不要直接删除外层文件。

## KI-010 · Node 26 运行时 warning

- 现象：出现 `module.register()` deprecated 和 `localStorage is not available` experimental warning。
- 影响：当前页面与已测 API 正常返回。
- 处理：记录为运行时环境观察；若后续出现 SSR 或构建异常，再按项目声明 Node 版本复核。

## KI-011 · 浏览器扩展注入导致 hydration mismatch

- 现象：浏览器控制台显示 `chrome-extension://dbjbempljhcmhlfpfacalomonjpalpko/scripts/inspector.js`，并与 `RootLayout` 的 `<head>` 脚本位置发生差异。
- 证据：服务端 `GET /` 返回 200；响应 HTML 含 `FONT_LOADER_SCRIPT` 和 `FETCH_GUARD_SCRIPT`，不含 `chrome-extension://`。
- 判断：扩展在 React hydration 前修改 DOM，触发 React hydration mismatch。当前没有证据证明 `src/app/layout.tsx` 生成了不稳定 SSR 内容。
- 处理：禁用对应扩展，或使用无扩展的隐身窗口/干净浏览器配置后硬刷新，再复测。
- 边界：若干净浏览器仍报 mismatch，再继续检查应用组件中的随机值、时间值和客户端首渲状态。

## KI-012 · 纯文本识别请求的 content 兼容性

- 现象：第 1 步直接输入题目文本时，识别链表现为不识别；上传图片路径正常。
- 调查：`Step1Entry` 已把文本传给 `recognizeProblem`，服务端也允许无图片题文；问题落在纯文本仍使用多模态数组 `content`，部分 OpenAI 兼容中转只接受文本字符串。
- 修复：`server/recognitionHandler.js` 在无图片时发送标准 string content；有图片时继续发送数组 content 和 `image_url`。
- 同步：`Step1Entry.tsx` 识别前统一读取并裁剪文本、图片数据，避免空白文本和显示状态与请求状态分离。
- 验证：纯文本真实本地请求返回 200、`ok=true`、`imageKind=text_only`；伪上游契约测试确认文本为 string，图片仍为数组并保留 `image_url`。
- 边界：已验证本地 API 和上游调用形状；浏览器实际输入、点击、画布视觉仍需夏夏刷新页面复测。

## KI-013 · Agent B 工作台重复控制项

- 现象：演播室标准栏重复提供「板书字体」选择；下方分列布局同时提供「标准全景」「专注口播」「专注板书」三个入口。
- 判断：字体选择已在后续预览页提供；本页重复入口增加决策成本。两个专注预设只改变列折叠状态，和右侧逐列折叠按钮重复。
- 修复：删除 Agent B 顶部字体下拉；删除两个专注布局按钮及对应预设映射；保留标准全景和逐列折叠。
- 边界：字体状态和交付物字段保留，后续预览页仍可切换并写回档案。

## KI-014 · AgentBDirect 批处理清空与同批语法断裂（2026-10-27）

- 现象：`AgentBDirect.tsx` 曾为 0 行，WorkbenchPage 默认导入后运行时出现 `Element type is invalid`。
- 修复：恢复 `AgentBDirect.tsx`，保留已有用户改动；目标文件语法检查通过。
- 当前阻断：`board-rules.js:78` 存在未闭合模板字符串；`agentBShared.ts:114` 存在孤立注释文本；`ToolsCard.tsx:41` 存在孤立 JSX 注释文本。
- 影响：全量 `tsc` 失败，`GET /` 当前 HTTP 500。
- 边界：AgentBDirect 恢复已验证；项目整体恢复未完成。

## KI-014 状态更新 · AgentBDirect 空模块与同批语法断裂已止血（2026-10-27）

- `AgentBDirect.tsx` 已恢复默认导出。
- `board-rules.js`、`agentBShared.ts`、`ToolsCard.tsx` 语法断裂已修复。
- `bunx tsc --noEmit`、目标 ESLint、首页 HTTP 200 已通过。
- 原 KI-014 的“当前阻断”已关闭，保留浏览器交互复测边界。

## KI-015 · proxySelfCheck 依赖真实上游可用性

- 现象：`bun server/proxySelfCheck.js` 在模型请求处收到 HTTP 503。
- 影响：该脚本未完成模型响应断言，不能作为真实上游链路通过证据。
- 当前处理：保留本地目录、契约和页面证据；待上游 Key/服务可用后重跑。


## KI-016 状态更新 · 页面启动与动作链已恢复（2026-10-27）

- KI-014 的语法阻断已关闭。
- Edge 独立浏览器已验证 Step1、Agent B 挂载和播放器初始化，未捕获异常为 0。
- `proxySelfCheck` 已通过；首个 HTTP 503 是脚本主动模拟，随后重试成功。
- 仍未验证真实用户配置下的识别、Agent B 生成、TTS 和完整画布交互。

## KI-017 · Agent B 表格上方信息密度（2026-10-27，UI 已调整）

- 现象：展开的参数、多色标签、常驻动画和并列操作使表格出现过晚，主操作不清楚。
- 处理：默认收起输入详情与时间轴；常用语音、演播保留，处理与交付动作使用两组菜单；重复规格移入详情，弱化装饰。
- 验证：隔离浏览器确认唯一生成入口、详情、菜单、时间轴、列控制与 1440/768/390 视口；异常 0，实际业务 API 请求 0。
- 边界：真实题目的视觉舒适度仍由夏夏复核；本轮不改变宽表内部列布局，不验证真实模型/TTS/交付。

- KI-017 展示规则补充（2026-10-27，D24）：输入交接台改为默认展开，方便甲方查看已完成的分析；时间轴和菜单分层保持现状。浏览器默认可见及手动折叠复验通过。
## KI-018 · Agent B 表格列宽挤压与视觉零碎（2026-10-27，UI 已调整）

- 现象：固定列与正文百分比宽度叠加，环节和动作被挤窄；高表头、多边框、多按钮干扰阅读。
- 处理：固定布局、正文均分、表格内部横向滚动；表头 46px，口播 15px，板书 20px；低频操作菜单化，移除无音频空心圆，空板书提示使用系统字体。
- 验证：类型、lint、CSS 与样例交互通过；四档视口整页无横向溢出，未捕获异常 0，实际业务 API 请求 0。
- 边界：当前题目舒适度待夏夏复核；真实模型、TTS、录制和交付未验证。
## KI-019 · 输入交接台摘要松散与页签辨识度弱（2026-10-27，UI 已调整）

- 现象：摘要、画布说明与题型风格呈现松散文字行，重复规格占位；三个页签透明底且仅字色变化，切换入口难发现。
- 处理：紧凑概览分行、删除重复规格及内部运行说明；页签保留浅色底，选中深色底，hover/focus 可见，窄屏换行。
- 验证：类型、lint、CSS 与四档样例浏览器交互通过；默认展开与手动收起保留，未捕获异常 0，实际业务 API 请求 0。
- 边界：真实题目视觉舒适度待夏夏复核；本轮未调用真实模型、TTS、录制、交付。
- 窄屏补充：参数表固定两列曾被挤成竖条；改为表内横向滚动，390px样例已确认可滚动且行高恢复。

## KI-020 · 题目区字号被重排与旧参数覆盖（2026-10-27，已修复）

- 现象：常量为30px，但Step1重排可生成26–29px；布局、分块、交接旧值能覆写题目字号，UI/导出也可能显示旧值。
- 处理：题目固定微软雅黑30px，移除减量及覆盖读取；布局/保存/导出使用独立常量，播放器镜像对齐，提示词与Check区分物理题目区和口播stage。
- 验证：旧字号12px覆盖先失败，修复后回归通过；播放器/离线模板48组输入，144项板书检查通过；浏览器实际平台字体Microsoft YaHei、设计字号30px，三种手写字体切换不影响题目。
- 边界：缩小预览随整画布同比缩放；上传原图与历史已栅格化截图不改写像素；本轮不清理历史产物，不调用真实模型/TTS/录制。
## KI-021 · 演播有声行无停顿、连续切行（2026-10-27，已修复）

- 现象：有声行gap为0且onended立即切下一行；无声行的gap数据也未被loop消费。
- 处理：播放页每行之间停顿1秒，复用虚拟钟并同步暂停续播和seek，末行立即结束；不修改生成和TTS。
- 验证：时间轴与播放控制回归通过；Edge真实媒体事件间隔1015ms/1013.6ms，异常0，API请求0。
- 边界：本地WAV证明播放调度，不代表真实TTS或录制验证；历史下载HTML需重新生成。

## KI-022 · 版本对比发现的业务边界（2026-10-29，2111已局部修复）

- 已修复并有本地回归：3/4x20口播误读、复杂分数丢括号、中点被转回x及播放器贴排镜像遗漏；持久行ID的缓存碰撞与编辑失焦根因；改稿留旧音频和配音异步错行；Check快速/失败路径漏审及正常启发提问误报；交付字体相对路径404。
- 边界：修复落在2111，xiu参考副本未改。真实模型/TTS、浏览器连续编辑/字体视觉、录制未验收；历史固化交付需重建。

## KI-023 · B缓存完整输入未进入键（2026-10-29，开放）

- 两版useBCache将题目仅取前80字、布局摘要仅取前200字；相同前缀不同题/布局可同键，子agent已用实际函数体隔离复现。
- promptVersionDigest只摘要默认提示词，所选李永乐模块变化不一定使缓存失效。布局修订强制生成分支有保护，不泛化为所有入口必错。
- 本轮未修改，后续应以完整业务输入及实际所选提示词形成稳定摘要，单独补回归。

## KI-024 · 本机Prisma生成客户端缺失（2026-10-29，开放）

- 全量tsc --noEmit --incremental false报src/lib/db.ts:1，@prisma/client没有导出PrismaClient。
- 本轮未改DB、安装或生成客户端；目标回归通过不等于全量类型或build通过。处理前先确认本地生成产物和项目数据库使用范围。

## KI-025 · 精简漏读题约束及代数分数兼容（2026-10-29，已本地修复）

- 本轮退化：默认读题要求只剩示例暗示，缺不讲解不报答案及标记1—3处条件的正文；分数原子限纯数字/字母，2x/3由3分之2艾克斯变成2艾克斯/3。
- 相关旧问题：李永乐小数样例3点14可能读十四；小数系数转成3点五后，未知数匹配只认阿拉伯数字，留下x。
- 修复：补回一条读题合同；保留样例并明确小数成品逐位读；分数接收数字系数单项式，未知数接收逐位小数系数。
- 证据：教学断言、2x/3、3x/4、2X/3、3.5x/4、2x/3x20先失败后通过；原3/4x20及加减边界、全部九组回归和目标ESLint通过，示例哈希通过。
- 边界：Check异步修改审查28例未复现覆盖新稿；上述均为源码/函数/VM验证。真实模型、TTS、浏览器连续操作、录制仍未验收，KI-023/024继续开放。

## KI-026 · 代数未知数后的加减号口播残留（2026-10-29，既有问题，开放）

- 独立审查者对比HEAD与当前源码确认：2x+4均输出2艾克斯+4；2x/3+4当前保留3分之2艾克斯+4。分数边界正确，但后续加减规则只识别数字/字母，未识别已变成中文的艾克斯。
- 该缺口早于本轮精简，不作为本轮新增回归；本次登记，尚未修复，后续单独补齐代数口播用例。真实TTS未调用。

## KI-027 · 未知数 X 真实TTS未试听（2026-10-29，待验收）

- 代码已统一口播输出 X，删除艾克斯规则；本地转换和Check规则通过。
- 未调用真实TTS，需用含未知数的真实讲稿试听确认上游声音自然读X。

## KI-028 · 口播文稿 Markdown 入口发现性（2026-10-29，已修复）

- 现象：口播 Markdown 导出已存在，但只放在“交付与导出”下拉中，用户误以为没有。
- 修复：五字段执行表顶部增加“口播文稿 MD”常显按钮，复用 `exportSpeech`；下拉删除重复入口。
- 验证：目标 ESLint、静态入口检查、行ID/音频竞态回归通过。
- 边界：浏览器实际点击、下载文件名和 Markdown 内容仍待现场验收。


## KI-029 · 当前题图存档缺失（2026-10-29，开放）

- 现象：当前 handoff/board-result/deliverable 都引用 `shot-20261027-151111-123.jpg`，但 `public/pic` 为空。
- 处理：恢复 deliverable JSON/HTML 实体，未伪造缺失图片。
- 下一步：重新进入 Step1 并保存题图快照，再验收交付页背景。

## KI-030 · `rowGapMs` 与演播页 GAP 双真源（已修复）

- 修复：`timing.js`、交付物 `uiSettings.rowGapMs`、演播页统一使用同一行间停顿；默认 1000ms，末行不计尾部停顿。
- 验证：`test-row-player-gap`、`test-cleanup-contract` 与 `git diff --check` 通过。
- 边界：历史固化 HTML 需重新生成；真实 TTS 与录制仍未验收。
## KI-031 · Check 回写仍依数组索引（2026-10-29，开放）

- 现象：Check 请求主动去掉 `_rowUid`，应用结果按索引合并。
- 风险：模型若在同 stage 内交换两行，可以错行保留音频。
- 修复方向：Check 请求/响应保留内部 row identity，外部交付物仍不输出。

## KI-032 · Windows 启动已恢复，数据库安装待验（2026-10-29）

- 原因：缺少 node_modules；dev 的 tee 管道可能掩盖错误退出码。
- 处理：补齐页面依赖、移除管道、生成 bun.lock；首页200，Edge 中 React 已挂载，未捕获脚本异常。
- 边界：@prisma/engines postinstall 下载等待超过35分钟，本次以 --ignore-scripts 完成安装；数据库生成、真实识别/TTS、生产构建未验证。

## KI-033 · lite player 标签曾按 stage 进度延迟出现（2026-10-29，已修复）

- 原因：`drawStageTag` 用各 stage 首行时间控制显隐，并附带 180ms 弹出缩放。
- 修复：移除时间门与缩放；四枚标签从第 0 帧常驻，位置继续读取用户当前 `boardPlan`。
- 验证：离线模板回归、行间停顿、动作白名单、目标 ESLint 通过；Edge 0% 与 73% 时间点均为 4 枚标签，脚本异常 0。
- 边界：未触发系统录屏权限；录屏捕获的主 canvas 已确认全时段含四枚标签。

---

## K-2026-10-29-A · 生产模式不服务运行期写入 public/ 的文件（已根治）

- 现象：发布域名 tttsss3.space-z.ai 上 `POST /api/tts/synthesize` 合成成功（文件已落盘、密钥轮换正常），但返回的 `/audio-cache/*.mp3` 一律 404——用户侧表现为「音频加载播放失败」。连带 `/pic/*`、`/board-result/*` 同病。
- 根因（双重叠加）：
  1. Next.js 生产/standalone 模式的 public 静态服务只认构建时清单，运行期写盘的新文件不会被服务；
  2. 「纯净完整版」交付 ZIP 打包时清空了 audio-cache/audio/pic，发布部署构建时这些目录本就是空的。
- 根治（2026-10-29）：
  - 新增 `src/app/api/asset/[...path]/route.ts` 动态资产路由：实时读盘、Range 206、ETag、防路径穿越；
  - `next.config.ts` beforeFiles 把 `/audio-cache|/audio|/pic|/board-result` 四目录重写到该路由，URL 形状不变（前端播放器、row-player、交付 JSON 离线契约零改动）；
  - 本地已实测：合成 86KB → GET 200(audio/mpeg, 10ms) → Range 206 → 文件同步落项目真身。
- 同批修复：`.zscripts/build.sh` 打包补 `doc/`（docReferences.js 导入期读盘，缺失即崩）与 `var/`（状态连续）+ 清理文件追踪误带入的工作区杂物。

## K-2026-10-29-B · dev 模式跨域拦截与「零域名限制」的兼容（架构决策）

- dev 模式的 allowedDevOrigins 白名单机制会拦截非白名单来源的 `/_next/*`（历史上预览面板与发布域名均中招）。项目裁定：**不允许任何域名白名单存在**。
- 决策：端口 3000 改跑 **standalone 生产模式**（`scripts/prod-serve.sh`，`bun run dev` 汇聚于此）。生产模式没有跨域拦截机制，任何来源域名一律放行（已实测 tttsss3/preview/任意 Origin 全部 200）；顺带解决 Turbopack dev 的内存与稳定性问题。
- 代价：改动代码后需 `bun run build` 重建（`dev:next` 保留 dev 模式逃生口，但预览面板会有跨域拦截）。

---

## KI-034 · /handoff 与 /deliverable 静态路由路径穿越（P0，已修复 2026-10-30）

- 现象（三路勘探实测）：`GET /handoff/..%2F..%2F..%2F..%2F.env` 200 拖出含密钥 .env 全文；`GET /deliverable/..%2F..%2Fpackage.json` 200 拖全仓 json/md。同款对照：`/api/asset` 一直有双层防线（正面样板）。
- 根因：两路由 decodeURIComponent 后直接 resolve，无 `..` 段校验（讽刺：deliverable 的 fonts/ 分支反而有校验）。
- 修复：双层防线（段校验 + resolve 后前缀强校验），基准目录由 handler 导出（HANDOFF_BASE_DIR / DELIVERABLE_BASE_DIR，单一真源防 cwd 口径漂移）。
- 回归：`scripts/test-handoff-route.mjs`（新增）+ test-deliverable-fonts 补顶层攻击用例；攻击链全 404、正常档/字体零误杀（实测）。修复过程引入的测试桩缺口（DELIVERABLE_BASE_DIR 未供给致误杀）同轮修正，教训入 AGENT_PLAYBOOK §6。
- 教训：本轮曾误撞编号（新条目冒用了 10-29 轮已占用的 KI-024~029），已重排为 KI-034~039——**追加错题前必须先 rg 全量现有编号**（入 AGENT_PLAYBOOK 铁律）。

## KI-035 · test-prompt-cleanliness 附录哈希单值钉死过期（已修复 2026-10-30）

- 现象：附录在数学口播统一化（艾克斯→X，KI 系改动轨迹）中有意编辑后，单值 pin 断言 FAIL。
- 判定：语义断言（无艾克斯/含 X 读法/小数逐位读等）全数成立——**测试期望过期，非业务回归**。
- 修复：沿用本文件 fenced 样例的多版本哈希白名单先例，附录 pin 升级为双版本白名单（保留历史哈希可审计）。改提示词附录时必须同步登记新哈希并注明原因。

## KI-036 · 源码 7 条 React hooks lint 错误（开放）

- `bun run lint` 现可用（KI-001 关闭后浮出）：BoardPreviewApp.tsx:467 / Step1Entry.tsx:226 / ui/carousel.tsx:98 / hooks/use-mobile.ts:14（set-state-in-effect）；ProcessLoadingModal.tsx:79,80（refs during render）；test-deliverable-fonts.mjs:11（no-assign-module-variable，测试自身写法）。
- 风险：hooks 规则违例是渲染期态错乱的温床；本轮裁定不动渲染逻辑，下轮专项治理（改一测一）。

## KI-037 · sessionid + loop 上下文携带机制：本仓不存在（开放，待用户指认副本）

- 用户口述"修改了但未记录"；三路考古（全仓 rg × 20 组关键词 + git 全史 pickaxe + 上传 ZIP 流式扫描）**零命中**——B 生成链实证为无状态单轮（messages 仅 [system,user]，重试在同请求内追加后即弃，agentBV2Handler.js:234-296）。
- 推断：该修复落在 KI-022 记载的其他工作副本（"xiu 副本"），未汇入本仓。**待用户指认副本后按 service.js body 字段 + handler messages 构造对勘取证，再回填本条目。**

## KI-038 · 前端配置层兜底密钥与双真源（开放，裁定级）

- 三份 `src/lib/*ApiConfig.js` 内置兜底 endpoint/key/model 明文打进浏览器包（.env 未设 NEXT_PUBLIC_AI_* 时恒生效；且 NEXT_PUBLIC 为构建期内联，运行时改 .env 无效——正解是页面 Agent 配置抽屉）。
- TTS 前端四处硬编码 referenceId+model（AgentBDirect.tsx:1221/1260/1299/1363），与 .env 的 FISH_AUDIO_MODEL/REFERENCE_ID 构成双真源，改 .env 前端不跟。
- .env 已进 git 库（git ls-files 实证）。叠加上一轮 KI-034 已拆除的穿越，密钥面收窄为"既定公开策略"，但三处双真源仍待归一。

## KI-039 · TTS 外呼无超时 + 死端点 + cleanup 破坏性语义（P1 批次，开放）

- fishAudioHandler.js:175 fetch 无 AbortController（对照 http.js 有 300s 超时+重试），上游挂起占死请求；batch 路径连带。
- 死代码面：POST /api/tts/batch 与 GET /api/deliverable/list 前端零消费；/api/screenshot 声明的 GET 恒 404；GET /api/tts（无子路径）404 与注释不符。
- POST /api/cleanup 无鉴权无 dry-run：keep 集只保当前指针档，全部历史 handoff/deliverable/board-result 与 48h 外音频一律删除，与 deliverableStoreHandler 头注释"支持历史回溯"承诺冲突——**语义裁定归档待定**（前端为手动按钮，误触低但不可逆）。
- 前端配套：12 处 fetch 无超时（TTS×4、deliverable×3、cleanup、handoff×2、check-apply、预览×2）与静默吞错点（AgentBDirect.tsx:199、BoardPreviewApp.tsx:354），明细已入 doc/AGENT_PLAYBOOK.md。

## KI-040 · sharp 直接依赖为模板遗留死依赖且带 3 条 high CVE（已拆除 2026-10-30）

- 来源：GitHub 推送回执暴露 Dependabot 3 条 high（sharp <0.35.0 / <0.35.4 / <0.35.5），指向 package.json 直接依赖 `sharp@^0.34.3`（实装 0.34.5）。
- 拆除依据（先证后拆）：全仓零 `import sharp`、零 `next/image`、next.config 零引用、.zscripts/Caddyfile/scripts 零契约引用（排除 db:push 同款平台雷）；Next 自带 `next/sharp` 可选解析（0.35.5 已修补）不随直接依赖走——判定为模板遗留死依赖，与 Prisma（KI-004）同性质。
- 执行：package.json 删直接依赖 → `bun install`（Removed:1，lockfile 仅剩 sharp@0.35.5 单一解析，@img 原生件对齐 0.35.5）→ 停守护 → `bun run build` PASS → 守护重启（pid 8209）。
- 验收：health ✓ · TTS keyCount=3 · 网关 200 · /api/asset 200/34KB · 11/11 测试 PASS。
- 原则沉淀（AGENT_PLAYBOOK §16）：Dependabot 告警先查消费方——零消费直接删，有消费才升级；死依赖的最优修法是拆不是升。
- 遗留提示：3 条告警挂远端 main（10-29 网页上传旧快照），20261030 分支合入或设为默认后告警自然消除。

## KI-041 · 双版提示词与四条教学铁律口径漂移（已归一 2026-10-30）

- 现象：基座版提示词编号混乱（1→四→二→五→8）、四环两写且缺环4、双检查表、小数读法严格/宽松并存、过期"附录 8.6 第 2 条演错重来"引用；four-rings.js "简单题几步揉一行"与用户铁律2（一步一 row）正面冲突；附录示例中文数字违反自家口播规则；check 侧读法区结构混杂。
- 处置：四条铁律（循序渐进不跳步 / 一步一 row / 关键公式写进分析区 / 严禁故意讲错——苏格拉底引导≠故意犯错误导）在基座版、liyongle 技能版、checkagent 版三处同口径落死；test-prompt-cleanliness 加铁律断言防回退；附录按 KI-035 白名单流程登记第 3 哈希（3d4b3489…）。
- 回归：11/11 测试 PASS；重建 standalone 部署后五项验收全绿（条目43）。
- 边界：检测引擎（skillViolations 教风铁律/一步一行铁律，2026-10-27 拍板）未动——提示词层与检测层现已同口径。
