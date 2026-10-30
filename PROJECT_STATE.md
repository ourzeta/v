# PROJECT_STATE — 实时真相

> 本文件 = 项目当前状态的唯一权威快照。每次收工必更新（收工六步之二）。
> 更新时间：2026-10-29 · 版本 qinghuabu-teaching-workbench 1.0.0
> 最新变更：GitHub 仓库已转 Private；远端 main 已包含本地已验收快照与 lite player 四区标签常驻修复。

## 本轮状态 · Windows 本地启动（2026-10-29，D37）

- 当前阶段：已恢复本机工作台访问，地址 http://127.0.0.1:3000/；目录 G:\22222\workspace-ff9122222\2111。
- 已确认设计：dev 使用 next dev -p 3000，日志由宿主重定向，保留错误退出码；保留 bun.lock 固定此次解析版本。
- 已验证边界：依赖安装退出0；npm run dev -- --help 退出0；首页 HTTP 200；Edge 1440×1000 验证 React 已挂载、6个按钮、5个输入、脚本异常0、业务API请求0。
- 当前代码状态：package.json 仅删除 dev 的 tee 管道；安装依赖并生成锁文件。后台运行使用 D:\env\nodejs\node.exe，进程号记录在 .zscripts/dev.pid，日志为 dev.out.log / dev.err.log。
- 已知的坑：原目录缺少 node_modules；tee 可把左侧退出码7掩盖成0。Prisma 引擎 postinstall 下载等待超过35分钟，终止该安装后以 bun install --ignore-scripts 收尾；数据库生成未验证。AGENTS.md 为 Next.js 本轮自动生成。
- 下一步接力棒：直接打开本机地址；真实识别、模型生成、TTS、录制和生产构建另行验收，历史端到端结果不代表本轮已重验。

## 本轮状态 · lite player 四区标签常驻（2026-10-29，D38）

- 当前阶段：仅调整 `public/row-player.html` 的四区标签显示门；题目、分析、解答、总结从第 0 帧到录制结束始终显示。
- 已确认设计：标签位置继续唯一读取用户当前 `boardPlan` 的四个 Label 坐标；拖动、恢复预设和布局重编译链保持原样。
- 已验证边界：播放器与离线导出 48 组标签/字体场景通过；行间停顿和动作白名单回归通过；真实 Edge 在第 0 帧与 73% 时间点均绘制 4 枚标签，模拟拖动坐标一致，脚本异常 0。
- 当前代码状态：删除按 stage 首行时间延迟显示和 180ms 弹出缩放；不改录制、播放、题目内容、板书内容、布局拖动或历史自定义数据。
- 已知边界：本轮未实际调用系统录屏权限弹窗；但标签与录屏共用主 canvas，真实浏览器已验证主 canvas 全时段绘制。
- 下一步接力棒：重新生成或打开 lite player 即可看到四区标签常驻；不要扩展为其他布局改造。
## 本轮状态 · GitHub 私有同步（2026-10-29）

- 当前阶段：`zo4xia/2111` 已转为 Private；远端 `main` 已包含双方历史及本地已验收快照。
- 已验证边界：GitHub API 确认仓库 `private=true`；远端 main 提交 `656b10e` 为“四区标签常驻并跟随当前布局”；Fish Audio 预设密钥 2 枚保留；聊天中的 GitHub token 未进入仓库 `.env`。
- 合并口径：保留远端 3 个独有提交的历史父链，但不让旧快照覆盖 2026-10-29 本地已验收代码；原始本地分支保留备份 `backup/pre-github-sync-20261029-1715`。
- 本机状态：`main` 与 `origin/main` 同步；`src/check-agent/prompt.js` 的既有未提交修改继续保留，未纳入本轮提交。
- 服务状态：开发服务已重启；HTTP `row-player.html` 与磁盘文件 SHA256 一致，包含四区标签常驻实现。
- 安全提醒：聊天中公开过的 GitHub token 应立即撤销并重新生成；本轮推送使用本机已有 GitHub 登录，不使用该 token。
## 当前阶段：完成了什么

- **Vue3+Vite → Next.js 16 原生 1:1 迁移完成并部署**（24k LOC：15 API routes + 13 前端组件 + 零改动播放器），黄金路径浏览器实测全通
- **功能冻结线**：上轮三大需求已交付（一键批量语音/双页面字体下拉/webm 保留+MP4 文本指引+音轨防哑剧）；用户明示「程序上闭环了，千万别弄绷现有功能」
- **质量清理完成**：tsconfig 污染根治（tsc 全绿）、垃圾三目录清除、BOM/零宽/CRLF 零命中、出参/包名名实对齐
- **商业交付标准化完成**：成品交付包 ZIP（`GET /api/deliverable/export`）+ 程序交付包脚本（`bun run release`）+ DEPLOY.md 部署标准
- **板书字体本地化闭环（本轮）**：除号减号电脑硬刷体坏象根修——ZIP 恒现场渲染（弃旧 companion 固化件）+ 字体收进 `board/fonts/`（与 html 同级硬契约）+ companion 模板新鲜度自愈 + 工作台表格板书列补手写字体栈；三渲染面（在线画布/离线 ZIP/生成表）VLM 实测全部手写减号+手写点
- **★ 音频生成只认用户点击（夏夏裁定 2026-10-26，推翻同日早前「生成即音频」口径）**：agentB 产物用户要先改稿编辑 + 跑 Check Agent，之后自己点「一键语音」（并发3波次链健在）；Task 15 私加的两处自动 hook（生成完成/缓存恢复）已拆除，未改稿自动 TTS=废音频烧配额

## 已确认的设计：新确认了什么

- 成品交付包格式 v1：`deliverable-{code}/{board/ 播放页+fonts/ 板书字体（★ 与 html 同级硬契约）, audio-cache/ 行音频, pic/ 题目图, data/ 工程JSON, manifest.json 验收清单, README.txt}`——复用 #017 相对路径契约（HTML 引用 `../audio-cache/`），播放器零改动，解压双击即可离线播放
- **字体双场景硬契约**：模板相对引用 `fonts/board-local.css` 只在「html 与 fonts/ 同级」时双场景（线上 /row-player.html→/fonts/、ZIP board/*.html→board/fonts/）同构命中；/export 恒现场渲染 = 商业包永远是最新模板+最新数据，companion（/deliverable/ 预览路径）过期由模板 mtime 自愈
- manifest 验收口径：files[].md5 逐文件校验；**manifest 不含自身**（自指不成立）；missing/external 如实披露不炸包
- 程序交付包：standalone 输出（next.config 已配）+ `scripts/build-release.sh`（--dry-run 前置自验已通过；完整 build 按平台规定不在本沙箱执行，由部署机运行）
- TTS 多 key 轮询（3 枚，逐请求轮换+故障切换）；批量合成并发=3 精确对齐 key 数
- **★ 数据流宪法（夏夏纠偏 2026-10-26）**：handoff=第1步交给 Agent B 的题目信息交接物（与 row 无关）；**rows 生于 Agent B 按契约的生成环节**；row.audioUrl 唯一写入口=setRowAudioUrl（真源+rowAudioCache+bCache 三写同步）；交付档序列化 audioUrl→mp3；lite player 音频驱动逐行连播；**生成类操作（agentB/TTS）只认用户点击，任何 useEffect/完成点/恢复点自动触发=违宪**；重新生成同文本=forceRefresh 重合成+返回 `?v=<ts>` 版本参数 URL 破浏览器缓存（读盘消费点一律剥 query）

## 已验证的边界：新验证了什么

- export API：有音频档（mp3 入包+md5 ALL PASS+离线契约命中）/ 无音频档（missing: 0 如实披露）/ 无档（404 语义引导）/ cleanup 后失效档（missing 披露）四态实测
- 浏览器端到端：识别 → 生成表 → 五字段生成 → 交付弹窗（新 ZIP 按钮）→ 下载触发 → network 200；控制台零错误零警告
- 黄金路径回归：一键语音/演播录制/生成交付单页按钮全部健在，功能零破坏
- **音频链全段实测（2026-10-26）**：行内生成语音→TTS 200→回填 audio-cache/4b22a570….mp3+真实时长10.9s→⏸暂停态抓拍；一键语音批量全回填；lite player 三个不同 mp3 依次自动切行（总时 73.46s 音频驱动）；★点击门禁双向实测：只点生成不碰语音→dev.log 零 TTS 请求；点一键语音→9/9 TTS 全 200 行内按钮全部切「重新生成」态

## 当前代码状态：改了什么

- **★ 提示词开场/收尾独立成行（D15）**：agent-b-v2/prompt.js（规则+样例拆行）+ 技能包三文件 + check-agent 保护条款，9 处手术六面统一；promptDigest 换血 00ikoe4w 旧缓存自动失效
- **★ 撤销自动语音 hook（2026-10-26 夏夏裁定）**：AgentBDirect.tsx 两处自动调 handleBatchGenerateAudio（生成完成点/缓存恢复点）拆除，原地留碑注释防再犯；一键语音按钮/行内小喇叭/↻ 重新生成零改动

- 新增 `server/releasePackage.js`（组装器：资源收集/md5/README/manifest）+ jszip 依赖
- `server/deliverableStoreHandler.js` GET `/export` 分支（纯加法）
- `DeliverableModal.tsx` 新增 ZIP 按钮 prop + 过期文案修正（public/deliverable → var/deliverable 实况）
- `AgentBDirect.tsx` 新增 downloadReleasePackage handler（a.click 下载）+ 弹窗接线
- 新增 `DEPLOY.md` + `scripts/build-release.sh` + package.json `release` script + .gitignore `/.release/`
- lint 0 error / tsc 0 error

## 已知的坑：发现了什么坑

- `resolve(path, '/x')` 对带前导斜杠的相对段会解析到**磁盘根**——`'../a/b'.slice(2)` 残留前导 `/` 致存在文件被误报缺失（已修，正则剥 `../` 三字符）
- `/api/cleanup` 按档引用保活清理 pic/audio-cache：时间戳档被清后其引用资源也会被清，export 时进 manifest.missing（如实披露是正确行为）
- `public/pic/` 曾被 cleanup 清空（keep 集合按当时档算）——新黄金路径会重新截图落 pic/
- 沙箱浏览器网络层对 fontsapi.zeoseven.com 返回空 204（字形级截图对比不可行，链路验证覆盖 UI→meta→DOM font-stack）
- `server/productionServer.js` 为 Vue 时代零引用死文件（DEPLOY.md 已标注历史地位，未删）
- **勘探方法论坑**：antd 6 Descriptions 已非 table/td 布局，旧选择器 .ant-descriptions-item-label 会假阴性「未渲染」——以全页截图看真身为准
- **平台部署坑**：4G 内存下 dev server 与平台构建并发可能挤死构建进程（06:45 构建目录全空实锤），重试即可；排查时禁止原地 bun run build（会打架 .next），用 /tmp 隔离拷贝复现

## 下一步接力棒：下轮要做什么

1. **部署验证**：平台「部署」按钮重试（构建隔离复现已全绿，上次失败为平台瞬断）；部署后按 DEPLOY.md 验收
2. **交付流程用户教育**：一键语音按钮保留（手动补齐/重试用），但主路径已自动——README.md 已写三步出片口径
3. **可选增强**：BoardPreviewApp（预览页）加同款「下载标准交付包」入口（当前只有 Agent B 弹窗 + API 直调）
4. 记录维护约定：改动后同步 ENGINEERING_LOG.md（新条目）/ DECISIONS.md（如有决策）/ 本文件（六段）/ 架构图（施工进展）

## 阶段一勘探快照（2026-10-27）

### 当前阶段：完成了什么

- 完成文档全量盘点、四层目录测绘、页面/API/handler/存储链扫描。
- 完成用户视角、产品视角和后续微调视角初步验算。
- 新增 `doc/project_initial_state.md`、`doc/resource_list.md`、`doc/risk_matrix.md`、`KNOWN_ISSUES.md`。
- 业务源码未修改；当前只建立施工前图纸、资源清单和风险闸门。

### 已确认的设计：新确认了什么

- 现行真源分工：`handoff` 是输入交接物，`rows` 在 Agent B 生成阶段产生，`row.audioUrl` 由 `setRowAudioUrl` 唯一写入，`current` 是交付档指针。
- 主用户链是「识题 → 交接 → Agent B → 用户编辑 → Check Agent → 用户点 TTS → 预览/交付/录制」。
- `public/row-player.html` 是播放页真身；`public/board-preview.html` 暂按兼容 shim 处理。
- 阶段二先做矩阵和引用证明，再决定拆分或删除。

### 已验证的边界：新验证了什么

- 仓库基线：`main @ 4aa6a73`，工作区干净，项目路径为 `G:\22222\workspace-ff9122222\2111`。
- 文本 BOM、零宽字符扫描结果为 0；未发现初始化级乱码证据。
- `npm run lint` 当前不可用，失败发生在 ESLint 命令入口，不代表源码 lint 结果。
- CodeGraph MCP 本轮两次返回 `Transport closed`；调用图结论已明确标注为回退扫描，不当作完整 AST 图。

### 当前代码状态：改了什么

- 只新增阶段一文档与记录，没有修改 `src/`、`server/`、`public/` 业务逻辑。
- 记录文件追加阶段一快照、工程日志、决策和架构图。

### 已知的坑：发现了什么坑

- `server/fishAudioHandler.js` 存在内置 provider credential 风险，需独立处理轮换与历史清理。
- `AgentBDirect.tsx` 约 3141 行，状态耦合高。
- Prisma 示例模型、历史服务端文件、兼容入口和运行时资源边界均未完成删除证明。
- 项目测试说明不完整，需阶段二建立最小可重复验证矩阵。

### 下一步接力棒：下轮要做什么

1. 建立 `AgentBDirect` 状态/事件/API 矩阵。
2. 追踪关键 API request/response contract。
3. 追踪 `src/lib/db.ts` 与 Prisma 使用链。
4. 为 `server/productionServer.js`、`public/board-preview.html` 做引用和入口证明。
5. 修复或明确 lint 运行入口后，再进入可验证施工。

## 运行验证快照（2026-10-27）

### 当前阶段：完成了什么

- 按项目 `bun.lock` 执行 `bun install --frozen-lockfile`，依赖安装完成：903 packages。
- 启动 `npm run dev` 成功，Next.js 16.1.3 已 Ready。

### 已验证的边界：新验证了什么

- `GET /api/health`：200，`status=healthy`，`service=qinghuabu-nextjs-dev`。
- `GET /`：200，返回工作台页面。
- `GET /board-preview`：200。
- `GET /row-player.html`：200。
- `GET /api/handoff`：200，返回现有 handoff 档案。
- `GET /api/deliverable`：200，返回现有交付档案。
- `/handoff/current`、`/deliverable/current` 直接路径返回 404；这是当前动态页面路径行为，不能替代 API 入口验证。

### 已知的坑：运行时新增观察

- Next.js 检测到父目录 `G:\22222\workspace-ff9122222\package-lock.json`，提示 workspace root 可能误判；项目自身使用 `bun.lock`。
- Node 26 输出 `module.register()` 弃用警告和 `localStorage` experimental warning；当前未阻断页面与 API。

### 下一步接力棒：下轮要做什么

- 保持开发服务运行，进入浏览器交互路径：上传/手填题目 → 识别 → handoff → Agent B。
- 继续区分 HTTP 冒烟证据与真实浏览器交互、真实 AI/TTS 证据。

## UI 交互整理快照（2026-10-27）

### 当前阶段：完成了什么

- 按截图标注整理 Agent B 工作台的操作层级。
- 空表隐藏顶部重复的「生成五字段」，中央只保留一个主入口。
- 有内容后保留「重新生成」，并将动作按内容、音频、演播与交付分组。
- 将「演播录制」改为「进入演播室」，将「生成交付单页」改为「交付与下载」。
- 交接三页签增加橙、绿、蓝分区底色和选中态。

### 已验证的边界：新验证了什么

- `bunx tsc --noEmit`：通过。
- `bunx eslint src/components/teaching/AgentBDirect.tsx`：通过。
- `GET /`：200。
- `GET /api/health`：200。
- 页面响应不含问号乱码片段。
- 本次修改只涉及 `AgentBDirect.tsx` 与 `AgentBDirect.css`。

### 当前代码状态：改了什么

- `src/components/teaching/AgentBDirect.tsx`：操作入口去重、文案修正、动作分组。
- `src/components/teaching/AgentBDirect.css`：页签识别色、按钮层级、操作组分隔线和窄屏降级。

### 已知的坑：发现了什么坑

- 当前还没有真实浏览器截图复核本次视觉结果；HTTP 与静态检查不能替代浏览器视觉验收。
- 当前工作区有此前用户操作产生的 `var/`、`public/pic/` 运行时文件，不把它们混入本次 UI 代码变更。

### 下一步接力棒：下轮要做什么

- 浏览器刷新工作台，确认空表和有表两种状态的按钮数量与文案。
- 点击三个交接页签，确认颜色区分不影响内容切换。
- 进入真实生成链后，再复核「进入演播室」和「交付与下载」是否符合用户预期。

## 纯文本题目识别修复快照（2026-10-27）

### 当前阶段：完成了什么

- 完成第 1 步「直接输入题文 → Agent A 识别 → 画布落位」链路排查。
- 修复纯文本请求的上游消息格式兼容性。
- 保留图片题多模态请求格式，文本题和图片题共用识别入口。

### 已确认的设计

- `Step1Entry` 负责输入状态和识别入口。
- `recognitionClient.js` 只调用本地 `/api/recognition/problem`。
- `recognitionHandler.js` 根据是否有图片选择消息格式：纯文本用 string content；含图片用 content 数组。
- 纯文本识别结果仍按 `imageKind=text_only` 处理，不贴原图。

### 已验证的边界

- 伪上游契约测试：纯文本 `messages[0].content` 为 string，包含用户题文；图片请求仍为数组，并含 `image_url`。
- 真实本地 API：纯文本请求返回 HTTP 200、`ok=true`、`problemType=word`、`imageKind=text_only`。
- `bunx tsc --noEmit`：通过。
- `bunx eslint src/components/teaching/Step1Entry.tsx`：通过。
- `git diff --check`：通过。
- 仍未宣称浏览器真实输入和画布视觉验收完成。

### 当前代码状态

- `server/recognitionHandler.js`：纯文本改用 string content，图片保留多模态数组。
- `src/components/teaching/Step1Entry.tsx`：识别请求使用裁剪后的文本和实际图片数据；按钮读取图片数据 ref 判断上传来源。
- 未修改 Agent B、TTS、交付链。

### 已知的坑

- 当前工作区包含此前用户操作生成的 `var/`、`public/pic/` 和交付资源，未清理。
- CodeGraph MCP 仍返回 `Transport closed`，本次调用图使用精确源码扫描替代。
- 浏览器扩展 hydration mismatch 仍需在干净浏览器中复测。

### 下一步接力棒

1. 夏夏刷新 `http://localhost:3000`。
2. 在第 1 步只输入一段纯文本题目。
3. 点击「识别并贴上画布」。
4. 核对请求成功、题干回填、画布显示、`imageKind=text_only`、可进入 handoff。
5. 再上传一张题目图片，确认图片识别未回归。

## Agent B 控制项减法快照（2026-10-27）

### 当前阶段：完成了什么

- 删除演播室标准栏重复的「板书字体」下拉。
- 删除「专注口播」「专注板书」两个布局预设入口。
- 保留「标准全景」和右侧逐列折叠控制。
- 保留字体状态、预览字体派生和交付字段；字体选择入口统一到后续预览页。

### 已验证的边界

- `bunx tsc --noEmit`：通过。
- `bunx eslint src/components/teaching/AgentBDirect.tsx`：通过。
- `git diff --check`：通过。
- `AgentBDirect` 中不再存在顶部字体下拉和两个专注布局按钮。
- `LAYOUT_PRESETS` 只保留标准全景映射。

### 当前代码状态

- `src/components/teaching/AgentBDirect.tsx`：删除重复字体控件和两个无必要布局入口；保留字体数据链。
- `src/components/teaching/AgentBDirect.css`：删除对应字体控件样式。
- `src/components/teaching/agentb/agentBShared.ts`：删除两个不可见布局预设映射。

### 下一步接力棒

- 夏夏刷新 Agent B 页面，确认顶部标准栏只保留画布规格和字号信息。
- 确认分列布局只显示「标准全景」，逐列折叠仍可用。
- 在后续预览页确认字体切换仍能写回交付档。

## AgentBDirect 运行时错误审计（2026-10-27）

### 当前阶段

- 已恢复 `src/components/teaching/AgentBDirect.tsx` 的非空源码。
- 已恢复 `export default function AgentBDirect(...)`。
- 已保留工作区已有的动作减法、字体入口减法和布局入口减法。

### 已验证边界

- 恢复前文件：0 行，仅 2 字节。
- 当前文件：2,888 行。
- `HEAD` 文件：2,992 行。
- `bunx eslint src/components/teaching/AgentBDirect.tsx`：通过。
- `git diff --check -- src/components/teaching/AgentBDirect.tsx`：通过。
- 当前文件仍含默认导出；不再是空模块。

### 未通过边界

- `bunx tsc --noEmit` 仍被其他工作区文件阻断：`board-rules.js:78`、`agentBShared.ts:114`、`ToolsCard.tsx:41`。
- `GET http://localhost:3000/` 当前仍返回 HTTP 500，因此未宣称页面恢复完成。

### 下一步接力棒

- 修复同一批处理造成的三个独立语法断裂，再做全量类型检查和浏览器复测。

## 横线动作移除与 AgentBDirect 恢复验收（2026-10-27）

### 当前阶段

- 阶段五：语法止血、动作白名单归一、启动验收。

### 已确认设计

- 板书动作唯一保留 `rough-notation`。
- `underline`、`circle` 是唯一动作。
- `rough-line`、旧 rough drawing 模块和相关 UI 分支已移除。
- 数学内容中的分数线、竖式横线、减号仍属于板书排版，不属于动作工具。

### 当前代码状态

- `AgentBDirect.tsx` 已恢复默认导出，保留既有 UI 减法。
- `boardToolCatalog.js` 版本为 `1.6.0`，工具目录只有 `rough-notation`。
- 未知工具返回 `{ ok: false }`。
- `deliverableStoreHandler.js` 先归一动作，再计算执行时间线。
- Check Agent、Agent B、时间轴、导出、播放器口径已收敛为 underline/circle。
- 删除无引用的 `src/board-tools/roughDrawingTool.js`。

### 已验证边界

- `bunx tsc --noEmit`：通过。
- 目标 TSX ESLint：通过。
- `node --check`：目录、时序、导出、代理自检文件通过。
- `git diff --check`：通过。
- `GET http://localhost:3000/`：HTTP 200，无运行时错误标记。
- `GET http://localhost:3000/api/health`：HTTP 200，`ok=true`。
- 工具烟测：目录为 `['rough-notation']`；rough-line 校验为 false；underline 校验为 true。
- `bun server/proxySelfCheck.js`：未完成，外部上游返回 HTTP 503，断言未得到模型响应；不是本地语法失败。

### 已知坑

- 浏览器扩展注入导致的 hydration mismatch 仍需用干净浏览器复测。
- `proxySelfCheck` 依赖真实上游 Key；当前 503 不能证明真实模型链路通过。
- `var/`、`public/pic/`、`public/audio-cache/` 和历史 board-result 未清理。

### 下一步接力棒

1. 夏夏刷新 `http://localhost:3000/`。
2. 输入纯文本题目，验证识别入口和 Agent B 进入链路。
3. 在 Agent B 生成一条 underline 和一条 circle，确认时间轴、播放器、导出一致。
4. 用无扩展浏览器复测 hydration console。


## 最终验收更新（2026-10-27）

- `AgentBDirect` 空模块已恢复；3 个同批语法断点已修复。
- 动作工具统一为 `rough-notation`，只允许 `underline`、`circle`。
- `rough-line` 执行分支、旧 rough drawing 模块、UI、提示词、Check Agent、时间轴、导出和播放器入口已收口。
- 数学板书中的横杆、分数线、竖式横线仍保留。
- 离线回归检查脚本：`scripts/test-action-whitelist.mjs`。
- 验证：`tsc`、目标 ESLint、JS 语法、离线 proxy self-check、动作回归、首页/健康接口、独立 Edge 浏览器挂载均通过。
- `proxySelfCheck` 中首个 HTTP 503 是测试模拟故障，重试路径已通过；不能替代真实用户 API 验证。
- 不触碰 `var/`、`public/pic/`、`public/audio-cache/`、历史 board-result。

## Agent B 顶部 UI 精简验收（2026-10-27）

- 当前阶段：阶段五，针对表格上方信息密度进行最小 UI 调整。
- 已确认设计：输入交接台默认展开，甲方直接查看处理结果；时间轴默认收起，待确认提示常显。空表只有中央生成入口；有内容时常显一键语音、演播录制。重新生成、数学口播优化、Check Agent 收入“更多操作”；归档与三种导出收入“交付与导出”。
- 当前代码状态：仅修改 AgentBDirect.tsx 和 AgentBDirect.css；去除重复标题标签和常驻呼吸动画，规格信息放回输入详情，讲课风格显示用户可理解的名称。生成状态按实际状态显示。
- 已验证边界：全量 TypeScript、组件 ESLint、CSS 解析、diff 空白检查；隔离 Edge 样例验证空表唯一生成入口、输入详情、菜单项目、时间轴、列折叠和恢复；1440/768/390 宽度操作栏在视口内，未捕获异常 0。AST 对比本轮改动前后的 68 个命名函数，函数体全部一致。
- 数据边界：测试样例仅注入隔离浏览器内存，handoff 读取由测试响应替代；实际业务 API 请求 0。未调用真实识别、生成、Check Agent、TTS、交付写入或清理。
- 已知限制：该轮验证证明 UI 与入口可用，不能代替真实模型、真实音频、真实录制交付验收；移动端原有宽表仍在表格区域内横向浏览。
- 证据：本机临时目录 agentb-ui-20261027 下 browser-proof.json、empty-desktop.png、table-1440.png、table-768.png、table-390.png。CodeGraph 当前 transport closed，使用已定位源码回退；Project Memory 写入工具未暴露，事件落入现有记录文件。
- 接力棒：夏夏刷新本地 Agent B，按真实改稿流程判断视觉层级；需要真实生成或语音时继续由用户点击触发。

- 收尾补证：首页与健康接口 HTTP 200；四个 project 缓存键均无现存条目，无需失效；UI 两文件相对本轮开始净减少 153 行，新增依赖 0。

## 输入交接台展示修订（2026-10-27，D24）

- 当前状态：进入 Agent B 时默认展开输入交接台，甲方直接看到题目、分析与参数；手动收起入口保留。
- 当前代码：只将 AgentBDirect.tsx 的 handoffDetailsExpanded 初始值从 false 改为 true。
- 验证：TypeScript、目标 ESLint、隔离浏览器默认可见及收起/再次展开检查通过；未捕获异常 0，实际业务 API 请求 0。
- 接力棒：夏夏刷新 Agent B 复核展示内容；时间轴与操作菜单沿用上一轮设计。
## Agent B 表格布局验收（2026-10-27，D25）

- 当前阶段：表格内部 UI 调整完成，等待夏夏用真实题目复核视觉舒适度。
- 已确认设计：固定表格布局；窄列固定宽，口播与板书均分剩余空间；输入交接台默认展开继续有效。
- 当前代码：仅调整 AgentBDirect.tsx 与 AgentBDirect.css 的展示；低频音频及行操作进入菜单，移除无音频空心圆；新增依赖 0。
- 已验证边界：TypeScript、目标 ESLint、CSS 解析、差异检查通过。68 个命名业务函数体保持一致；样例验证菜单、增行、环节切换、键盘编辑、添加动作及列折叠恢复。
- 视口：1440、1280、768、390；整页无横向溢出，窄屏表格内部滚动；表头 46px，口播 15px，板书 20px；未捕获异常 0，实际业务 API 请求 0。
- 已知边界：样例未验证真实模型、TTS、录制和交付。表格列宽冲突记为 KI-018，已在 UI 层处理。
- 下一步：刷新 Agent B，用当前题目逐行检查阅读与编辑体验。
- 证据：%TEMP%/agentb-table-ui-20261027/browser-proof.json、browser-smoke.mjs、table-desktop.png；变更树见实时架构图。
## 输入交接台概览与页签验收（2026-10-27，D26）

- 当前阶段：截图标注的摘要松散与页签切换不明显已调整，待夏夏复核真实题目。
- 已确认设计：摘要用紧凑浅底分行呈现题目、分区、知识参考、年级和画布规格；去掉重复画布标签与内部运行说明；三个页签常有浅色填充，选中深色，键盘焦点可见。输入交接台继续默认展开。
- 当前代码：AgentBDirect.tsx 调整展示结构与页签名称，AgentBDirect.css 收口概览和页签样式；68 个命名业务函数体一致，新增依赖 0。
- 已验证边界：TypeScript、目标 ESLint、CSS 解析、差异检查与四档样例浏览器通过；三页签点击、键盘切换、焦点、收起再展开正常，整页无横向溢出。未捕获异常 0，实际业务 API 请求 0。
- 当前边界：本轮验证 UI 样例，未调用真实模型、TTS、录制、交付。运行产物与历史目录未清理。
- 证据与接力棒：%TEMP%/agentb-handoff-ui-20261027/browser-proof.json、handoff-1440.png 及其余尺寸截图；刷新 Agent B 复核标注位置。
- 窄屏参数表：小于640px时内部横向滚动，保留可读列宽；390px下三页签参数表滚动检查通过。

## 原题印刷区独立字体验收（2026-10-27，D27）

- 当前阶段：题目区字体规则止血完成。原题印刷区固定 Microsoft YaHei（微软雅黑）30px；分析、解答、总结继续各自手写体规则，不能合并为同一字体域。
- 根因：重新排版会从题目30px减去图片偏移和随机档位；旧 topicLayout.question、blocks.fontSize、canvasParams.fontSize.question.px 又可覆盖。服务端 uiSettings 展开顺序也容许旧 questionFontSize 覆写；UI和Markdown曾展示旧值。
- 当前代码：独立公共常量、Step1排版、布局规划、BoardContentLayer渲染/保存、RealBoardPreview入口、Agent B参数显示、播放器镜像、提示词/Check及服务端/Markdown导出对齐。stage=题目仅为口播阶段，不把整行board内容改成印刷体。
- 已验证边界：类型、目标lint、语法及diff检查通过；固定字体回归覆盖旧字号、三种布局、重新排版、旧分块、三种手写体选择及内存导出。播放器/离线模板48组输入与144项板书字体字号颜色检查通过；动作白名单回归通过，磁盘业务写入0。
- 浏览器：纯文本落位及连续3次重排、含96/80/72旧字号的预览、三种手写体切换均通过。CDP报告实际字体 Microsoft YaHei，按设计画布归一字号30px；未捕获异常0，实际业务API请求0。
- 已知边界：缩小预览随整画布同比缩放。上传原图和历史已栅格化截图中的像素不改写，需要重新落位/截图才会反映新规则；历史产物未清理。真实模型/TTS/录制未调用。
- 接力棒与证据：刷新后重新落位当前题目，确认题目印刷区与手写三区独立；%TEMP%/question-font-20261027/browser-proof.json、preview-question-and-handwriting.png。回归：bun scripts/test-question-font.mjs、node scripts/test-question-font-player.mjs。
## Check Agent 常显入口（2026-10-27，D28）

- 已完成：Check Agent 内容检查从更多操作移至五字段执行表顶部，空表也可见但禁用；生成中禁用、检查中显示loading。
- 代码：AgentBDirect.tsx仅移动入口，原checkRows与结果处理函数未改；新增依赖0。
- 验证：类型、目标lint、68个命名函数体一致性、差异检查通过；1440/768/390样例浏览器确认唯一常显入口、空表禁用、有稿可用、点击后结果弹窗正常，整页无横向溢出。未捕获异常0，实际业务API请求0。
- 边界：浏览器API被隔离，检查结果来自既有本地回退；不证明真实Check模型可用。下一步：夏夏刷新后直接使用顶部按钮。
- 证据：%TEMP%/agentb-check-button-20261027/browser-proof.json、check-button-1440.png。
## 表格自适应与浅底纹验收（2026-10-27，D29）

- 当前阶段：列宽改为auto，口播/板书展开时minWidth各300px；最小总宽从各列实际要求计算，不再固定1100px。桌面随容器扩展，窄屏表内滚动，折叠时最小宽同步降低。
- 当前代码：AgentBDirect.tsx使用现有Table.minWidth；AgentBDirect.css增加浅绿/暖白斑马、淡列分隔线与输入区域常驻细边框。新增依赖0，68个命名业务函数体未变。
- 验证：类型、目标lint、CSS、diff检查通过；1440/1280/768/390样例下正文列不小于300px，表宽分别1338/1178/918/918px，全部折叠为434px；整页无横向溢出。
- 交互：音频菜单、行操作、增行、切换环节、键盘编辑、添加动作、列折叠恢复通过；Check Agent顶部唯一入口保留。异常0，实际业务API请求0。
- 接力棒：刷新复核底纹轻重和真实长稿阅读；真实模型/TTS/交付未调用，历史产物未清理。证据%TEMP%/agentb-adaptive-table-20261027/browser-proof.json、table-desktop.png。
## 演播页行间停顿验收（2026-10-27，D30）

- 当前阶段：仅在public/row-player.html增加行间1秒停顿；当前音频完整结束后才计时，停顿保留当前板书，末行无额外停顿。
- 当前代码：复用GAP与既有虚拟钟/seekTo，无定时器、新配置或依赖；总时长包含行间停顿。暂停冻结、继续保留剩余停顿，拖到停顿内不重播上一句。
- 验证：新增回归先复现4000ms缺少行间停顿，修改后总长5000ms通过；音频/无声行、暂停续播、拖动、重载、末行及重播检查通过。真实Edge解码3个300ms本地WAV，两次停顿1015ms和1013.6ms，总长2900ms，异常0、API请求0。
- 回归：node scripts/test-row-player-gap.mjs、node scripts/test-question-font-player.mjs、bun scripts/test-action-whitelist.mjs通过；播放器/离线模板字体48组与144项板书检查通过。
- 接力棒：刷新演播页试听真实讲稿的1秒节奏。真实TTS生成和录制未调用；历史固化HTML需重新生成才含新模板。证据%TEMP%/row-player-gap-20261027/browser-proof.json。

## 2026-10-29 · 版本优点吸收与提示词清理（D31）

- 当前阶段：完成 xiu / 2111 当前工作树业务比较，在2111选择吸收已确认的改进；未合并整仓，xiu作为参考副本未改业务源码。
- 已确认设计：提示词只保留教学目标、输入含义、输出合同与必要约束；示例保留。默认Agent B由19,230字符降到7,652字符（约60%），Check由7,791降到3,669字符（约53%）；默认完整JSON、动作样例、风格附录、李永乐六套JSON逐字保留。工程日期/Task标签退出模型运行正文。
- 当前代码：中点乘号与分数语义、口播转换、播放器镜像、交付字体路由；持久行ID、Check列表键、菜单重播；改稿清理旧音频、异步配音按行ID与口播绑定；Check教学审计覆盖本地快速/网络失败回退。
- 已验证：新增数学、行ID/音频竞态、Check教学、字体路由、提示词示例保留回归通过；既有题目字体、播放器/离线字体、动作白名单、每行1秒停顿回归通过。验证使用实际源码函数、VM隔离与网络模拟，未发真实业务请求。
- 全量类型边界：tsc --noEmit --incremental false完成，报src/lib/db.ts:1，@prisma/client未导出PrismaClient；本轮未修改DB/依赖，不声称全量构建或类型通过。
- 已知待办：两版共有缓存键截断/所选风格摘要缺口仍开放；xiu实验题库含缺图占位且有重复实现，本轮不迁移。真实模型、Check、TTS、浏览器连续编辑、录制未验证。历史已固化HTML须重新生成。
- 下一步接力：夏夏刷新2111，先实际试连续编辑、改稿后配音，再用真实题目验证新提示词讲解效果。优点清单和施工前证据见外层2111与xiu业务流版本对比-20261029.md；具体变更树见架构图。

## 2026-10-29 · 核心保留交叉巡检（D32）

- 当前阶段：两位只读审查者分别核对教学语义与运行链路，主审重跑回归并修复确认项；发现两处本轮退化：读题约束弱化、带数字系数代数分数口播遗漏。
- 当前代码：默认提示词补回读题不讲解或报答案、空板书、按朗读顺序下划线标1—3处条件；原小数样例保留，明确成品逐位读；分数支持2x/3及小数系数。默认提示词现为7,716字符，先前7,652是巡检补回前数值。
- 已验证：新增教学语义断言及代数分数用例先失败后通过；九组回归和本轮三份源码ESLint通过。18份改动源码无既有导出缺失；首页、Step1、表格CSS、生成/Check服务端与离线模板相对HEAD未改。
- 核心保留：四环、分年级、公式唤回和归题、独立开收场、四列合同与示例、动作/题目字体规则、改稿音频失效和异步行绑定、演播1秒停顿。Check异步修改保护经审查者28个真实函数用例未复现旧结果覆盖。
- 验证边界：提示词约束测试不证明真实模型服从；函数/VM/网络模拟不证明浏览器、真实Check/TTS或录制。既有缓存摘要KI-023、Prisma生成客户端KI-024仍开放；本轮未重新跑全量tsc或build。
- 接力棒：用真实题目检查读题阶段不提前报答案、关键条件标记及真实讲解；缓存与Prisma另行处理。详细证据见ENGINEERING_LOG条目32、KI-025与架构图。

- 独立复核补充：数学修复经三个实际ASR入口42项断言与4项边界通过；新增登记既有KI-026（未知数后的加减号未转中文），仍开放。

## 2026-10-29 · 口播文稿 Markdown 导出入口前置（D34）

- 当前阶段：完成 Agent B 口播文稿 Markdown 导出入口可见性修复。
- 已确认设计：五字段执行表生成后，顶部操作栏直接显示“口播文稿 MD”；按钮复用既有 `exportSpeech`。交付下拉仅保留交付单页、画布分镜表 MD、完整规格 JSON。
- 当前代码状态：`src/components/teaching/AgentBDirect.tsx` 新增一个常显下载按钮，删除下拉中的重复口播入口；导出内容、函数参数、依赖未改。
- 已验证边界：目标 ESLint 退出0；静态入口检查通过；行ID/音频竞态回归通过。未做浏览器实际点击、下载文件名与内容人工验收。
- 已知的坑：按钮只在五字段执行表有行时显示；空表仍先生成执行表。真实下载仍需浏览器验收。
- 下一步接力棒：刷新 Agent B，生成执行表后点击顶部“口播文稿 MD”，确认浏览器下载文件及 Markdown 内容。


## 2026-10-29 ? 生成物清理与业务参数审计（D35）

- 当前阶段：完成可再生缓存清理、清理路径修正、交付实体恢复与业务链路参数审计。
- 已确认设计：真实存储位于 `var/handoff` 与 `var/deliverable`；清理器必须解引当前指针和资产引用。
- 当前代码状态：`server/cleanupHandler.js` 改为读取真实存储并清理过期 handoff；新增 `scripts/test-cleanup-contract.mjs`；从 `current.html` 恢复了缺失的 deliverable JSON/HTML 实体。
- 已清理：93个旧生成文件，释放 8.16 MB；删除 `.next`、`dev.log`、`tsconfig.tsbuildinfo` 本机可再生缓存。
- 已验证边界：清理契约回归、行ID/音频回归、目标 ESLint 通过；当前 deliverable 实体可被 API 读取。
- 业务审计待处：`rowGapMs` 与演播页固定 1 秒间隔仍未完全收口；Check 返回仍按数组索引合并；当前题图资源缺失。
- 下一步接力棒：先修演播 gap 单一真源和 Check row identity，再重新生成题图快照。

## 2026-10-29 · 清理与参数口径收口（D36）

- 当前阶段：完成生成垃圾清理、存档断链恢复、行间停顿口径归一、试听播放门修复。
- 已确认设计：
owGapMs 统一由 canvasParams.rowGapMs 进入交付物 uiSettings.rowGapMs；演播页读取该值，默认 1000ms。所有行保留思考停顿，末行不计尾部停顿。
- 当前代码：	iming.js、AgentBDirect.tsx、public/row-player.html 三处使用同一停顿规则；seekTo 不再绕过 canplaythrough 直接播放；清理器使用真实 ar/handoff 与 ar/deliverable 指针。
- 已验证：	est-cleanup-contract、	est-row-player-gap、	est-row-uid-stability、	est-math-consistency、	est-prompt-cleanliness、git diff --check、
ode --check server/cleanupHandler.js 通过。
- 已知边界：Check 回写仍需按 _rowUid 合并；当前题图仍缺失；真实模型、真实 TTS、浏览器连续操作与录制未验收。
- 下一步接力：重新生成当前题图快照；随后单独处理 Check identity 合并，不扩大清理范围。




还没完成
checkagent 和agentb两个版本提示词里面，要整理好，（先全部内容遍历，感觉内容优点乱，整理一下格式化一下，顺序结构一下，冲突的要化解一下，归一化）要做好：1、循序渐进，讲题解答，不要跳步。2、尽量不要一堆内容都堆砌在一个row里面，导致音频很难对准板书书写节奏。尽量要写的时候都单独一row，一个步骤一个row，尽量减少一堆步骤写在一row里面；解题的关键公式，3、在分析区域，解题思路过程中，将公式在里面可以写出来，让小朋友对知识点能够有唤醒和复习；4、苏格拉底式的递进式引导思考≠故意犯错误导！切忌故意讲错！这样会带偏孩子的思路，且ooc！还有  checkagent 补充给他一句额外补充提示说明：除了我们已经发现的口播发音规则，万一遇到了还没有收录的（告诉他原因：口播稿优化一定要结合题目意思和语境，因为普通tts不支持很多数学符号和公式，所以一定要在分数、分数运算、平方、方程解答，等等数学方面的多留个心眼，口播稿不是板书，板书要书写正确，但是口播稿只要发音发的对，千万要帮忙多检查哦）需要补充一个事:读题环节，（特殊）读题的内容按照题目原题内容读，不要checkagent注意，不要修改题目的大小写，阿拉伯数字，是阿拉伯就是阿拉伯，因为我们的工具是锚定题目原文的文本来画下划线，画圈，（反面示例：如果原题：十五天，口播稿文案写15天，会导致不一致，就无法画圈画标记了。切记这个特殊情况）checkagent和agentb的两个提示词都要注意这个问题