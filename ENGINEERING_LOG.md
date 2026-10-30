# ENGINEERING_LOG — 自包含工作单元

> 每个工作单元一个条目，收工六步之三。历史原始档案见 `worklog.md`（Task 1-8 全文），本文件收编索引并自此接管新条目。

## 条目 9 · 商业交付标准化（成品 ZIP + 程序包 + 部署标准）｜2026-10-26 01:35

**背景**：程序功能已冻结（用户红线「千万别弄绷现在的程序各个功能」），缺口在交付/部署/商业交付包的标准化——此前交付物只有「打开单页 + 下载裸 JSON」，离线交付（音频/题目图随包走）、验收口径（md5）、程序部署说明均缺失。

**思路**：复用既有 `#017 相对路径契约`（normalizeDeliverableAssetPaths 把资源归一为 `../audio-cache/`）——zip 内把播放页放 `board/` 子目录、资源放其同级，则解压双击即离线命中，播放器/渲染端零改动；纯加法施工（新 handler 分支 + 新按钮），不动任何既有分支。

**执行步骤**：
1. 勘探：renderDeliverableHtml（模板+内嵌 JSON 机制）、deliverableStoreHandler（分发/落盘/current 指针）、DeliverableModal（弹窗现状）、compat（query 透传）、zip 能力探底（Bun 无原生 → 引 jszip 3.10.2）
2. 写 `server/releasePackage.js` 组装器（资源收集/目录防穿越/md5/README BOM/manifest）
3. `deliverableStoreHandler.js` 加 `GET /export` 分支（镜像 /list 先例）
4. DeliverableModal 加「下载标准交付包 (ZIP)」按钮 + AgentBDirect 接 downloadReleasePackage（a.click 下载）
5. DEPLOY.md（两种交付物/env 清单/standalone 启动/反代/验收口径/FAQ）+ scripts/build-release.sh（--dry-run 自验）+ package.json release script

**代码变更**：见《项目实时架构模块图.md》§五变更树。

**发现和确认**：
- `resolve(path, '/x')` 带前导斜杠的段直接解析到磁盘根——`slice(2)` 残留 `/` 使存在的文件被误报缺失（正则剥 `../` 三字符修复，实测踩坑）
- manifest 不能记录自身 md5（自指不成立）——files 清单排除 manifest.json
- `/api/cleanup` 按档引用保活清理资源：时间戳档删除后其 pic/audio-cache 也会被清，export 以 manifest.missing 如实披露（不炸包）
- `server/productionServer.js` 确认 Vue 时代零引用死文件（DEPLOY.md 标注历史地位，未删）

**验证结果**：
- 有音频档：mp3 入包 + manifest md5 **ALL PASS** + 离线契约命中（HTML `../audio-cache/` → 包内文件）+ README BOM/CRLF + `__INITIAL_DELIVERABLE__` 内嵌
- 无音频档（新黄金路径生成）：题目图入包、missing: 0（未引用即不虚报）、external: []
- 无档/档被清：404 语义引导（curl 实测）
- 浏览器端到端：修公路题 → 识别 → 生成表 → 五字段生成(5.7s) → 交付弹窗（新按钮在位+文案已修正）→ ZIP 点击 → network `GET /export 200`；控制台零错误零警告；一键语音/演播录制等既有按钮健在
- 质量门：eslint 0 error（server/ 在既有 ignore 清单内，运行时已实测）/ tsc 0 error / build-release.sh --dry-run exit 0

**接力棒**：真机 `bun run release` 部署实测（本沙箱平台规定禁 build）；可选给 BoardPreviewApp 加同款 ZIP 入口；交付包如需商业定制（品牌页/缩略图）见 PROJECT_STATE 待办。

---

## 历史工作单元索引（详情见 worklog.md 原始档案）

| Task | 主题 | 一句话结论 |
|---|---|---|
| 1-2 | Next.js 基础层 + 11 中间件→Route Handlers | 后端 API 契约 100% 对齐；产物目录 public→var（URL 不变） |
| 3 | 前端地基（vueShim/layout/Providers） | reactive 等价层+useSyncExternalStore；4 单例切换，vue 依赖清零 |
| 4-a | Step1Entry.vue→React | 1486 行；useSyncedRef 桥接「先写后读」12 处关键链路 |
| 4-b | AgentBDirect.vue→React | 3029 行+7 子模块；36 ref 桥接；表格 bodyCell 留主文件防漂移 |
| 4-c | BoardPreviewApp.vue→React + /board-preview | 1354 行；录屏链路 1:1；FadeTransition 状态机 |
| 4-d | 6 共享组件→React | 2752 行；react-hooks v6 三连报错逐层修复；useReactiveMap 重设计 |
| 5-6 | 集成修复 + 端到端对照验证 | SSR 500×2 修复；与原版像素级一致；黄金路径全通 |
| 5-7 | antd v6 弃用清零 + TTS 预设恢复 | 9 处 prop 等价替换；3key 轮询实锤（连续请求 key①→key②） |
| 5-8 | 一键语音/字体下拉/webm 指引 | 并发3波次；双页面字体联动；恒 webm+MP4 文本指引+音轨防火 |
| 8 | 部署失败排查 + 全仓质量清理 | tsconfig 污染根治（tsc 全绿）；垃圾三目录清除；BOM 零命中 |
| 10 | 除号减号手写体根修 + 字体链归一 | ZIP 恒现场渲染+字体入 board/fonts/+companion 自愈+表格列手写栈；三面 VLM 全过 |
## 条目 10 · 音频回填链收口 + 音频链全段实证 ｜ 2026-10-26 17:00

- **背景**：夏夏三连怒斥「音频呢？？？」——其 15:36 会话生成的交付档 9 行全部 mp3='音频暂未生成'，lite player 无声。指控「做好的被推翻」。
- **思路**：不蒙，先勘探七步——原版 Vue（vue-legacy 分支考古）→ 现行链路逐环实测 → 以数据实况定断点。
- **执行步骤**：
  1. 原版考古：generateRows() 纯文本无 TTS；音频=行级小喇叭（生成→playAudioUrl 自动播放→回填）+ Task 5-8 一键语音
  2. 全链实测：行内生成语音→TTS 200→回填 audio-cache/4b22a570….mp3+真实时长 10.9s→⏸暂停态抓拍✓；一键语音 8/8✓；lite player 三个不同 mp3 依次自动切行（73.46s 音频驱动）✓
  3. 数据实况：用户会话 dev.log 零 TTS 请求 + audio-cache 零新文件 + 67 秒会话时长 → 音频从未被触发，链路本身没坏
  4. 断点定性：生成与音频是两个孤立动作=流程欠账（夏夏规格：点击生成→音频一组一组跟上）
  5. 修复：生成完成点（新生成 L1823 / 缓存恢复 L1800）各一行 hook handleBatchGenerateAudio()——复用既有并发3波次链，零新机制；缓存行自带 audioUrl（setRowAudioUrl P2 已同步刷 bCache）→ 批量快照天然跳过，不重复烧配额
- **代码变更**：src/components/teaching/AgentBDirect.tsx 仅 2 处 hook（+注释）；其余为零
- **发现和确认**：数据流宪法（夏夏纠偏）——handoff 与 row 无关，rows 生于 Agent B 生成环节；row.audioUrl 唯一写入口=setRowAudioUrl（真源+rowAudioCache+bCache 三写）
- **验证结果**：清 bCache 全新生成会话→只点生成→全部行自动获得音频（0 个「生成语音」按钮残留=无一缺音频）；dev.log 14 枪 TTS 全 200 数学闭合（上题 8+本题 6）；lint 0 error
- **接力棒**：部署按钮重试（构建隔离复现全绿）；行内小喇叭/一键语音/重新生成全部原样保留未动

## 条目 11 · 自动语音 hook 废止——生成类操作只认用户点击 ｜ 2026-10-26 12:10

- **背景**：夏夏裁定（逐字）「一键生成是要用户点击才可以！agentB 生成的内容用户要自己修改编辑，还有 checkagent，没经允许自动生成要浪费多少资源」——条目 10/D12 的自动 hook 在用户改稿前就烧 TTS 配额，产物是废音频。
- **思路**：先全面取证再拆——handleBatchGenerateAudio 全部调用点 + 全部 useEffect 扫描 + 三处 TTS fetch 归属确认，确保只拆越权两处、不误伤正主。
- **执行步骤**：
  1. 取证：调用点 4 处（L1525 函数本体/L1800 缓存恢复 hook/L1823 生成完成 hook/L2871 按钮正主）；5 个 useEffect 全清白（拉 handoff 兜底/清定时器/同步 props/读字体/重算时间轴）；三处 /api/tts fetch 全在用户点击处理器内（小喇叭/↻/批量按钮）
  2. 拆除：两处自动 hook 删除，原地留碑注释（夏夏裁定+违宪警告）；函数本体/按钮/行内小喇叭/↻ 零改动
  3. 记录纠正：PROJECT_STATE/D12 标废/D13 立新/架构图 mermaid ③④⑤⑥ 重排（改稿+Check Agent 入序列）
- **代码变更**：AgentBDirect.tsx 净 -6 行（两 hook+旧注释 → 两段碑文注释）；零逻辑新增
- **发现和确认**：流程正序=agentB 生成→用户改稿→Check Agent→用户点一键语音→回填→lite player 连播；「一键语音」按钮 title 本就写明并发3对齐3key轮询语义
- **验证结果**：活体双向实证——①填题→识别→抽取知识→确定进入生成表→点生成：agentB 200(6.3s) rows 落地，dev.log 增量 TTS=0，行内全部「生成语音」待命，Check Agent/一键语音解锁但静止；②点一键语音：9/9 TTS 全 200(2.8~6.8s)，行内全部切「重新生成」态=音频回填；console 零错误零警告；lint 0 error
- **接力棒**：无待办；按钮态与 dev.log 数学闭合即真相

## 条目 12 · 重新生成新语音链接刷新回填（URL 版本参数破缓存）｜ 2026-10-26 17:26

- **背景**：夏夏裁定「重新生成的新的语音链接要刷新回填，明白吗！」——行内 ↻ 重新生成后，用户看到/听到的还是旧音频。
- **根因（勘探实锤）**：audio-cache 文件名=md5(text::refId::model)。同文本重新生成 → forceRefresh 真重合成并覆盖写同名文件，但**返回的 URL 字符串与旧值一字不差** → setRowAudioUrl 回填的 src 不变 → 浏览器 audio 元素不重载、直接用内存旧音频。改稿重生成正常（md5 变），没改稿重生成（对旧语音不满意重出一版）名存实亡。
- **修复（3 处最小增量）**：
  1. `server/fishAudioHandler.js` synthesizeSpeech：forceRefresh 重合成成功 → 返回 `/audio-cache/<md5>.mp3?v=<Date.now()>`（破浏览器缓存，前端拿到真"新链接"）；普通合成路径保持裸 URL
  2. 同文件 saveSpeechLocally：两处读盘前剥 query（audioUrl 入参 L247 + synthResult.audioUrl L270）——防 `?v=` 进磁盘路径，save-local 45ms 命中本地文件零烧枪
  3. `src/lib/deliverableAssetPaths.js` toRelative：剥 query——ZIP 离线 mp3 契约字段保持纯相对文件名
- **验证（活体全链）**：
  - curl 直测：普通合成裸 URL ✓ / forceRefresh 返 `?v=1793035247295` ✓（同 md5 同文本实锤）/ save-local 带 ?v= 入参 46ms 成功零烧枪 ✓
  - 浏览器活体：行 1 小喇叭首合成回填裸 URL（10.9s）→ 点行内 ↻（★踩坑：find text 先命中工具栏「重新生成」，须用行内 reload 图标按钮）→ bCache/界面 URL=`...mp3?v=1793035495555`、真实音频 10.9s→10.6s（时长联动=内容真换）、自动播放新链接、errors=0
  - 带 ?v= URL 点保存本地 → 新档 /audio/ 回填上墙，46ms 零烧枪 ✓
- **代码变更**：server/fishAudioHandler.js 3 处 + src/lib/deliverableAssetPaths.js 1 处；前端零改动（setRowAudioUrl 三写同步链天然兼容新 URL）
- **发现和确认**：lint 0 error（server/ 在 eslint ignore 清单，warning 非代码问题）；key 轮换健康（VOL→5-R 连续可见）
- **接力棒**：无待办。SET_ROW_AUDIO_URL 三写铁律+读盘剥 query 成对出现，后续任何 audioUrl 磁盘消费点必须同样剥 query

## 条目 13 · agentB 提示词开场/收尾独立成行（夏夏口径：同学你好…独立成句，路虽远…独立成行）｜ 2026-10-26 17:40

- **背景**：夏夏要求 agentB 提示词（多版本全量）写明：开头第一句「同学你好，很高兴为你讲解这道题」独立成句；全局结束语「路虽远，行则将至」独立成行。
- **病灶**：五个提示词面的话术规则本来就写了，但①没一个写「独立」；②主 prompt 与技能包示例本身是反面教材（开场+读题挤一行、收尾+总结挤一行）——LLM 学示例快过学规则，示例不改等于白改。row 是行单位（音频/连播都以 row 为单位），开场收尾混行会毁掉行级节奏。
- **修复（9 处手术，5 个文件）**：
  - prompt.js：Stage1/Stage4 规则补「独立成句/独立成行」+ 完整 JSON 样例开场拆两行（开场行纯句+读题行带下划线 actionSpec）+ 收尾拆两行（总结行+收尾行）
  - skills/liyongle-elementary/speech-rules.js：开场/收尾规则改「第一个/最后一个 row + 只说这一句」
  - skills/liyongle-elementary/output-format.js：自检清单 ①② 补独立口径
  - skills/liyongle-elementary/examples.js：示例开场行去掉「我们来看这道题哈。」尾巴变纯句（收尾示例本已独立）
  - check-agent/prompt.js：收尾金句绝对保护条款补「保持独立成行（收尾句独占最后一个 row）」
  - default-fallback 复用主 prompt 零副本自动生效
- **验证**：模块级断言 6 面全过（主 prompt 规则/示例、技能 speechRules/自检/示例、check-agent）；活体全流程（新题：苹果240千克是梨3倍）——首行=纯开场句、次行=读题、末行=纯收尾句、倒数第二行=纯总结，10 行；全程未点语音按钮 dev.log 零 TTS（D13 点击门禁复验）；promptVersionDigest 00ikoe4w（旧缓存自动失效，Task 50 机制）；lint 0 error
- **接力棒**：示例与规则成对修改是铁律——只改规则不改示例=白改

## 条目 14 · 阶段一勘探与施工闸门建立｜2026-10-27

**背景**：夏夏要求从产品实用性、用户流程、逻辑一致性、后期微调成本、程序一致性和旧垃圾清理视角先认识项目，再施工。认知不清时禁止直接改代码。

**思路**：把项目按「地基、布线、控制器、软装」分层测绘。先锁定页面、API、handler、存储真源和用户主链，再列复用资源、风险和删除闸门。CodeGraph MCP 不可用时，明确回退 context-mode、rg 和精确源码扫描。

**执行步骤**：

1. 读取工程开发模式 owner 文档和项目现有四份记录。
2. 盘点 README、技术说明、自检、部署和架构文档。
3. 完成目录四层测绘、页面分析、API/handler/存储路径扫描。
4. 扫描 BOM、零宽字符和编码基线。
5. 以用户和产品经理两个视角模拟主流程。
6. 新增初始状态、资源清单、风险矩阵和已知问题台账。
7. 建立阶段二施工闸门：先矩阵和引用证明，后拆分、删除或逻辑修改。

**代码变更**：

- 新增 `doc/project_initial_state.md`。
- 新增 `doc/resource_list.md`。
- 新增 `doc/risk_matrix.md`。
- 新增 `KNOWN_ISSUES.md`。
- 更新 `PROJECT_STATE.md`、`ENGINEERING_LOG.md`、`DECISIONS.md`、`项目实时架构模块图.md`。
- 未修改业务源码。

**发现和确认**：

- 最大耦合点是 `AgentBDirect.tsx`；不能按文件长度盲拆。
- `handoff`、`rows`、`audioUrl`、`current` 职责已确认。
- lint 失败是命令入口问题；当前没有源码 lint 结论。
- provider credential、Prisma 示例模型、历史服务端文件、兼容入口和运行时资源是后续重点。

**验证结果**：

- `git status` 确认嵌套仓库基线干净后开始记录。
- 文档文件存在，包含 Mermaid 流程图和变更记录。
- 业务源码路径未被阶段一脚本修改。
- 未声称 CodeGraph 调用图完整，未声称 lint 通过。

**接力棒**：阶段二完成状态/事件/API 矩阵、数据层使用链和删除证明；在证据完成前不改业务逻辑。

## 条目 15 · 本地开发服务启动与 HTTP 冒烟｜2026-10-27

**背景**：夏夏要求和阿圆一起把项目运行起来，按步骤确认当前项目真实状态。

**根因定位**：第一次 `npm run dev` 失败。检查发现嵌套仓库没有 `node_modules`，`node_modules/.bin/next.cmd` 与 `eslint.cmd` 均不存在。不是源码启动错误。

**执行步骤**：

1. 读取项目 `package.json` 与 `bun.lock`。
2. 执行 `bun install --frozen-lockfile`。
3. 再次执行 `npm run dev`。
4. 读取 `dev.log`，确认 Next.js Ready。
5. 对首页、预览页、播放页、健康接口、handoff 和 deliverable API 做只读请求。

**代码变更**：无业务代码变更；依赖目录为本地运行产物，锁文件未改。

**验证结果**：

- `bun install --frozen-lockfile`：903 packages installed。
- `npm run dev`：Next.js 16.1.3，`http://localhost:3000`，Ready。
- `/api/health`、`/`、`/board-preview`、`/row-player.html`、`/api/handoff`、`/api/deliverable` 均返回 200。
- 未验证真实浏览器点击、真实识题上游、Agent B 上游和 Fish Audio TTS；当前证据只覆盖启动和 HTTP 冒烟。

**发现和确认**：

- 父目录 lockfile 触发 Next workspace root warning。
- Node 26 输出两个运行时 warning，当前不阻断请求。

**接力棒**：保持服务运行，开始浏览器主链交互验证；每一步记录输入、页面状态、API 请求和结果。

## 条目 16 · 浏览器 hydration mismatch 根因定位｜2026-10-27

**背景**：浏览器打开首页后出现 React hydration mismatch，错误栈指向 `src/app/layout.tsx:102` 的字体加载脚本。

**调查**：

1. 检查 `RootLayout`：`FETCH_GUARD_SCRIPT`、`FONT_LOADER_SCRIPT`、样式字符串均为模块常量，服务端与客户端输入稳定。
2. 检查浏览器报错差异：服务端位置被 `chrome-extension://dbjbempljhcmhlfpfacalomonjpalpko/scripts/inspector.js` 占用。
3. 直接请求 `GET /`：200；响应 HTML 含字体脚本和 fetch 守卫，不含任何 `chrome-extension://`。
4. 对比服务端与浏览器错误：扩展脚本只出现在浏览器 DOM 差异中。

**结论**：当前证据支持浏览器扩展注入是根因。没有修改 `layout.tsx`，避免用应用代码迁就外部 DOM 改写。

**验证结果**：

- 服务端 HTML：`extensionScript=False`、`fontScript=True`、`fetchGuard=True`。
- HTTP 页面仍返回 200。
- 业务源码无变更。

**接力棒**：先禁用对应扩展或用无扩展浏览器重载首页；若仍报错，再继续查应用首渲随机值、时间值和客户端存储恢复。

## 条目 17 · Agent B 工作台操作层级整理｜2026-10-27

**背景**：截图显示交接页签不易区分，空表同时出现两个同义生成入口，底部「演播录制」与「生成交付单页」对用户都像最终动作。

**思路**：保留现有事件和 API，只收敛用户入口。空表只保留一个生成主入口；有内容后按「内容处理 → 音频 → 演播/交付」分组，用文案和颜色表达先后关系。

**代码变更**：

- `src/components/teaching/AgentBDirect.tsx`
  - 空表隐藏顶部生成按钮。
  - 有内容显示「重新生成」。
  - 「演播录制」改为「进入演播室」。
  - 「生成交付单页」改为「交付与下载」。
  - 操作栏增加内容、音频、交付三个分组。
- `src/components/teaching/AgentBDirect.css`
  - 三个页签增加分区色和选中态。
  - 演播按钮保持主行动蓝色。
  - 交付按钮改为浅绿色次行动。
  - 操作组增加分隔线，窄屏取消分隔线。

**发现和确认**：

- 两个原按钮都与 `/api/deliverable` 有关联，但「进入演播室」直接打开播放录制页，「交付与下载」打开交付面板；功能不同，原文案造成重复感。
- 空表中央按钮与顶部按钮调用同一个 `generateRows`；保留两个入口没有增加能力。

**验证结果**：

- `bunx tsc --noEmit` 通过。
- `bunx eslint src/components/teaching/AgentBDirect.tsx` 通过。
- 首页和 `/api/health` 返回 200。
- 未宣称完成浏览器视觉验收。

**接力棒**：夏夏刷新页面，按空表/有表/页签三个状态复核视觉和操作语义。

## 条目 18 · 第 1 步纯文本识别链路修复｜2026-10-27

**背景**：夏夏发现第 1 步直接输入纯文本题目时识别失败，上传图片路径正常。纯文本是合法核心输入，必须和图片题共用识别入口。

**排查**：

1. 扫描 `Step1Entry.tsx`，确认文本输入绑定 `problemText`，识别按钮允许文本存在时触发。
2. 追踪 `Step1Entry → recognitionClient → /api/recognition/problem → recognitionHandler → requestChatCompletion`。
3. 确认服务端空输入守卫允许「只有题文」请求。
4. 发现服务端无图片时仍构造 `content` 数组；部分 OpenAI 兼容中转对纯文本只接受 string content。

**代码变更**：

- `server/recognitionHandler.js`
  - 无图片时把系统提示和用户题文合并成标准 string content。
  - 有图片时保留数组 content 和 `image_url`。
- `src/components/teaching/Step1Entry.tsx`
  - 识别前统一裁剪文本。
  - 识别前读取实际图片 data URL。
  - 识别按钮使用图片 data URL 判断上传来源。

**验证结果**：

- 伪上游契约测试通过：纯文本为 string；图片为数组且含 `image_url`。
- 真实本地 API 纯文本请求通过：HTTP 200、`ok=true`、`imageKind=text_only`。
- `bunx tsc --noEmit` 通过。
- `bunx eslint src/components/teaching/Step1Entry.tsx` 通过。
- `git diff --check` 通过。

**接力棒**：夏夏在浏览器复测纯文本输入、画布落位和 handoff；随后复测图片路径。

## 条目 19 · Agent B 重复控制项清理｜2026-10-27

**背景**：截图标出两个产品层问题：Agent B 顶部重复出现板书字体选择；分列布局提供两个实际重复的专注预设。用户要求做减法，去掉无实际必要的花哨入口。

**思路**：保留数据链和真正有用的逐列折叠能力，只删除重复 UI 和无调用的预设映射。字体选择继续由后续预览页承担。

**代码变更**：

- `src/components/teaching/AgentBDirect.tsx`
  - 删除顶部「板书字体」下拉及其本页事件入口。
  - 删除「专注口播」「专注板书」按钮。
  - 保留字体状态派生、交付字段和「标准全景」。
- `src/components/teaching/AgentBDirect.css`
  - 删除顶部字体控件专用样式。
- `src/components/teaching/agentb/agentBShared.ts`
  - 删除两个已无 UI 调用的布局预设映射。

**验证结果**：

- `bunx tsc --noEmit` 通过。
- `bunx eslint src/components/teaching/AgentBDirect.tsx` 通过。
- `git diff --check` 通过。
- 未完成浏览器截图验收。

**接力棒**：夏夏刷新页面，复核顶部标准栏、分列布局和后续预览页字体切换。

## 条目 20 · AgentBDirect 空模块恢复审计｜2026-10-27

**背景**：WorkbenchPage 渲染 `AgentBDirect` 时出现 `Element type is invalid`。工作区文件检查显示 `AgentBDirect.tsx` 被批处理清空，默认导入得到空模块对象。

**思路**：先比对文件长度、默认导出和 `HEAD`，再从 `HEAD` 恢复源码；保留已有动作减法和 UI 减法，不覆盖其他工作区文件。

**代码变更**：

- `src/components/teaching/AgentBDirect.tsx`
  - 从 `HEAD` 恢复非空组件源码。
  - 保留默认导出。
  - 保留用户已有的横线动作移除、重复字体入口移除、两个专注布局入口移除。
  - 修复横线移除后遗留的 JSX 三元表达式和 `changeActionType` 孤立分支。

**验证结果**：

- 当前文件 2,888 行；`HEAD` 文件 2,992 行；清空状态为 0 行。
- 目标文件 ESLint 通过。
- 目标文件差异检查通过。
- 全量 `tsc` 仍失败于三个其他文件；首页 HTTP 500，等待后续语法修复。

**接力棒**：修复 `board-rules.js:78`、`agentBShared.ts:114`、`ToolsCard.tsx:41` 后重新执行 `bunx tsc --noEmit`、首页 HTTP 检查和浏览器复测。

## 条目 21 · 横线动作移除与空模块语法止血｜2026-10-27

**背景**：批处理曾清空 `AgentBDirect.tsx`，并留下 `board-rules.js` 模板未闭合、共享注释断裂、ToolsCard 孤立 JSX 文本。动作收口同时要求移除 rough-line，避免旧逻辑回流。

**执行**：

- 从当前工作区和 HEAD 边界恢复 `AgentBDirect.tsx`，保留已有用户改动。
- 修复 3 个真实语法断点。
- `boardToolCatalog` 只保留 `rough-notation`，补回版本常量和未知工具拒绝返回。
- 删除无引用 `roughDrawingTool.js`。
- 清理 Check Agent、Agent B prompt、时间轴、导出、播放器的 rough-line 文案和执行分支。
- 导出链先归一 actionSpec，再计算 row 时间线。
- 保留数学板书横杆和竖式横线；只移除动作工具横线。

**验证**：

- `bunx tsc --noEmit` 通过。
- 目标 ESLint 通过。
- 目标 JavaScript `node --check` 通过。
- `git diff --check` 通过。
- 首页 HTTP 200，健康接口 HTTP 200。
- 工具目录烟测通过：rough-line=false，underline=true。
- `proxySelfCheck` 被真实上游 HTTP 503 阻断，已单独记录。

**变更树**：

```text
动作白名单
├─ boardToolCatalog → rough-notation only
├─ Check Agent / Agent B prompt → underline + circle
├─ UI / VisualTimeline → 两动作
├─ deliverable → 先归一再排期
├─ row-player → 只执行 rough-notation
└─ roughDrawingTool.js → 删除无引用旧模块

启动止血
├─ AgentBDirect.tsx → 恢复 default export
├─ board-rules.js → 恢复模板结尾并重写动作规则
├─ agentBShared.ts → 修复块注释
└─ ToolsCard.tsx → 删除孤立文本
```

**接力棒**：浏览器干净环境复测主页、纯文本识别、Agent B 两动作和 hydration console。


## 条目 22 · 最终白名单回归与浏览器实测（2026-10-27）

**执行**：

- 修复播放器对禁用动作仍计时的问题；播放器只对有效 rough-notation 动作排期。
- 导出层忽略输入自带旧 `plan`、`exclusiveExecutionPlan` 和时长，统一由归一后的 actionSpec 重算。
- Skills Hub 仅修复指定五页的活文档/演示残留；`skill-6` 保留 rough-line 拒绝负例。
- 新增 `scripts/test-action-whitelist.mjs`，不写运行产物，覆盖目录、校验、契约、提示词、播放器镜像、导出计划。

**验证结果**：

- 回归脚本通过：目录、Check Agent、契约、提示词 JSON、播放器、导出计划一致；磁盘写入 0。
- `bun server/proxySelfCheck.js` 通过；首个模拟 503 后重试成功。
- `bunx tsc --noEmit` 通过。
- 目标 ESLint 通过。
- 目标 JavaScript `node --check` 通过。
- `git diff --check` 通过。
- 独立 Edge 浏览器：Step1 挂载、调用真实 Workbench 回调切 Agent B、row-player 初始化；未捕获异常 0。

**边界**：未调用真实付费识别或 Agent B 生成；浏览器验证使用只读 handoff，付费 API 请求数 0。

## 条目 23 · Agent B 表格顶部 UI 减法（2026-10-27）

**背景**：用户反馈交接状态、参数、彩色标签与全部操作挤在表格上方，难以判断下一步。

**思路**：用户视角优先看到生成或编辑表格；产品视角按内容处理、演播、交付分层。复用现有 Ant Design Dropdown、Button 和浏览器原生 details，新增依赖 0。

**执行与变更树**：

```text
Agent B 顶部 UI
├─ AgentBDirect.tsx
│  ├─ 输入明细默认收起，规格与生成元信息移入详情
│  ├─ 待确认提示常显，详情入口有 aria-expanded/aria-controls
│  ├─ 空表保留唯一生成入口，有内容后保留语音与演播
│  ├─ 更多操作：重新生成 / 数学口播优化 / Check Agent
│  ├─ 交付与导出：交付单页 / 口播 MD / 分镜 MD / JSON
│  ├─ 时间轴按需展开，列折叠与恢复保留
│  └─ 生成状态、讲课风格文案与实际用户状态一致
└─ AgentBDirect.css
   ├─ 移除本轮废弃装饰样式与常驻呼吸动画
   ├─ 状态、摘要、按钮使用统一轻量层级
   └─ 窄屏换行，六步状态紧凑排列
```

**发现与确认**：外层工作区和嵌套 2111 仓库都有同名源码，实际服务运行嵌套仓库；本轮只写嵌套仓库。初期字符串匹配失败均在写入前退出；改为 UTF-8 临时脚本、唯一锚点和完整性检查后才写入，未清空文件。

**验证**：TypeScript、目标 ESLint、CSS 解析、diff 检查通过；68 个命名函数的 AST 文本与本轮修改前一致。独立 Edge 样例验证空表、详情、两组菜单、时间轴、列折叠/恢复和三档视口；未捕获异常 0，实际业务 API 请求 0。浏览器使用内存样例，不写运行产物。

**边界与接力棒**：真实生成、语音、录制与交付未重跑；本轮未改业务处理函数。夏夏在真实题目中复核 UI 轻重和操作路径。运行产物与历史目录均未清理。

- 收尾补证：首页与健康接口 HTTP 200；四个 project 缓存键均无现存条目，无需失效；UI 两文件相对本轮开始净减少 153 行，新增依赖 0。

## 条目 24 · 输入交接台默认展开（2026-10-27）

- 背景：夏夏要求让甲方直接看见输入分析和处理结果。
- 思路与执行：复用已有展开逻辑，仅修改初始状态；不增加组件或依赖。
- 变更树：AgentBDirect.tsx / handoffDetailsExpanded：false 改为 true；PROJECT_STATE、DECISIONS、实时架构图同步当前展示规则。
- 决策：D24 修订 D23 的输入展示方式，时间轴默认收起和菜单分层继续有效。
- 验证：bunx tsc --noEmit、目标 ESLint、diff 检查通过；隔离浏览器确认初始 hidden=false、实际 display 可见、aria-expanded=true，手动收起与再次展开正常。未捕获异常 0，实际业务 API 请求 0。
- 证据：临时目录 agentb-ui-20261027 / default-expanded-smoke.mjs、handoff-expanded-desktop.png。
- 边界与接力棒：本轮只改 UI 默认状态；真实生成、语音与交付未调用。夏夏刷新页面复核。
## 条目 25 · Agent B 表格阅读与操作减负（2026-10-27）

- 背景：夏夏反馈表格看起来不舒服；环节、动作被挤成竖排，正文小，单元格边框与按钮过多。
- 思路：用户视角优先阅读口播和板书；产品视角保留常用操作，低频操作进入现有菜单。
- 执行：去掉正文列超额百分比宽度，使用固定表格布局与内部横向滚动；简化表头、环节标签、单元格边框；放大阅读字号。保留一个常用语音按钮，将其余音频操作和四个行操作收进菜单；保留删除确认。板书支持键盘进入编辑。
- 代码变更：AgentBDirect.tsx、AgentBDirect.css；系统图与施工进度图、状态、D25 和 KI-018 同步更新。变更树见实时架构图。
- 发现与确认：外层工作区与嵌套项目有同名文件，本轮仅改运行中的嵌套项目；68 个命名业务函数体未变，输入交接台默认展开，新增依赖 0。
- 验证：bunx tsc --noEmit、目标 ESLint、PostCSS 解析、scoped diff 检查通过。独立 Edge 内存样例验证菜单、增行、切换环节、键盘编辑板书、添加动作、列折叠与恢复；1440/1280/768/390 四档整页无横向溢出。未捕获异常 0，实际业务 API 请求 0。
- 证据：%TEMP%/agentb-table-ui-20261027/ 下的 verify-scope.cjs、browser-smoke.mjs、browser-proof.json 与四档截图；最终桌面截图已人工查看。
- 边界与接力棒：真实模型、TTS、录制及交付未调用；由夏夏刷新后用当前题目复核。运行产物与历史目录未清理。
## 条目 26 · 输入交接台概览与页签可识别性（2026-10-27）

- 背景：夏夏截图指出，顶部规格摘要不成行，三个切换页签缺少颜色，用户难以发现。
- 思路：用户视角要先读清摘要、再辨认可切换入口；产品视角保持输入工作可见，同时减少重复信息与套叠卡片。
- 执行与代码变更：AgentBDirect.tsx 将四个摘要字段、画布与字号规格、题型风格归入 handoff-overview；去掉重复画布标签和内部时序说明。原 Tabs 的 key 与内容保持，名称改为配比与参数、交接信息、题目分析与知识点；去内层 qh-surface-card。AgentBDirect.css 提供概览分行、页签填色、选中/悬停/键盘焦点与窄屏换行。删除本轮形成的孤儿样式。
- 发现与确认：原参数区采用透明文字行，页签 active 仅改字色，视觉层级过弱。默认展开、API、业务处理函数继续原有行为；68 个命名函数体一致，新增依赖 0。
- 验证：bunx tsc --noEmit、目标 ESLint、CSS 解析、scoped diff 检查通过。独立 Edge 内存样例验证 1440/1280/768/390 四档，每档三页签可点、选中与未选中底色有区别、键盘可切换且焦点可见、整页无横向溢出；收起与再展开通过。未捕获异常 0，实际业务 API 请求 0。
- 证据：%TEMP%/agentb-handoff-ui-20261027/ 下的 verify-scope.cjs、browser-smoke.mjs、browser-proof.json、handoff-1440.png 与其余屏宽截图。
- 记录与接力棒：D26、KI-019、系统图、施工进度图和变更树同步；夏夏刷新后复核真实题目。真实模型、TTS、录制和交付未调用；运行产物与历史目录未清理。
- 窄屏补验：人工截图发现参数表被挤成竖条；小于640px时参数表内部横向滚动，保留最小640px内容宽度。四档浏览器重验通过，390px下已验证表格可滚动且不再撑成长条；最终桌面和窄屏截图已查看。测试脚本按实际点击容器、ARIA关联面板和屏幕阅读器文本修正定位，未将脚本断言失败记作应用异常。

## 条目 27 · 题目印刷区固定微软雅黑30px（2026-10-27）

- 背景：夏夏明确题目区与分析、解答、总结不是同一字体域；题目必须硬性固定微软雅黑30px。
- 思路：用户视角要稳定区分原题与推演；工程视角从公共常量、布局来源、渲染边界、存储出口分别消除旧值覆写，复用已有 QUESTION_FONT_SIZE / QUESTION_FONT_FAMILY，不增加配置系统。
- 执行：Step1去除字号减量，旧题目分块恢复时归一字号；boardLayout三种规划固定题目30px；BoardContentLayer固定字体字号，按设计画布同比缩放并在保存时归一。移除RealBoardPreview不生效的题目字号读取。Agent B参数明确区分题目印刷区与板书三区；播放器镜像、提示词/Check、Markdown与服务端uiSettings出口对齐。
- 变更树：stepHandoff.js；Step1Entry.tsx；boardLayout.js；BoardContentLayer.tsx；RealBoardPreview.tsx；AgentBDirect.tsx；row-player.html；board-rules.js；coordinate-rules.js；check-agent/prompt.js；speechMarkdown.js；deliverableStoreHandler.js；两份字体回归脚本。图与详细变更树见实时架构图。
- 发现与确认：修复前回归可复现布局12px覆盖30px；重新落位可变26–29px。原题区不是stage，不能按stage=题目把整行板书改成印刷体；后三个区已有字号配置和字体选择保持。
- 验证：bunx tsc --noEmit、四组件ESLint、目标语法与diff检查通过。bun scripts/test-question-font.mjs覆盖旧字号、布局、重排、分块、字体选择与内存导出；node scripts/test-question-font-player.mjs覆盖播放器及离线模板48组输入、144项板书检查；bun scripts/test-action-whitelist.mjs通过，磁盘业务写入0。
- 浏览器证据：独立Edge测试纯文本落位、3次重排、预览中伪造旧字号及三种手写体；实际平台字体Microsoft YaHei，归一设计字号30px；三区仍为各自手写体，未捕获异常0，实际业务API请求0。证据在%TEMP%/question-font-20261027/，已查看四区对照截图。
- 验证工具边界：现有动作脚本依赖bun:test，使用Bun运行；Node运行失败属于运行时不匹配。浏览器等待React挂载后再输入、等待预览监听就绪后注入样例，不将早发事件的测试失败记作产品回归。
- 接力棒：刷新并重新落位当前题目；原图/旧截图像素不能凭字体参数改写，本轮不改历史产物。真实模型、TTS和录制未调用。
## 条目 28 · Check Agent 恢复顶部常显（2026-10-27）

- 背景：夏夏明确Check Agent重要，按钮不能隐藏。
- 思路：用户应直接发现检查入口；产品流程保留改稿、检查、语音的可见顺序，不增加自动检查。
- 执行与代码变更：AgentBDirect.tsx在语音按钮前常显Check Agent，空表或生成中禁用，检查中loading；移除更多操作中的重复检查项，并移除该菜单与检查状态的loading耦合。复用原checkRows('standard')。
- 发现与确认：68个命名函数体完全一致，业务逻辑未改，新增依赖0。
- 验证：bunx tsc --noEmit、目标ESLint、diff与函数体对比通过。隔离Edge验证1440/768/390的唯一常显入口、空表禁用、有稿可用、菜单无重复入口、点击触发既有结果弹窗；异常0，实际业务API请求0。
- 边界：API隔离后走既有本地回退，未验证真实Check模型；运行产物和历史目录未改。
- 变更树与接力棒：顶部按钮新增/菜单检查项删除/菜单loading解耦；D28与实时架构图同步，刷新即可使用。证据在%TEMP%/agentb-check-button-20261027/。
## 条目 29 · 表格自适应、最小列宽与浅斑马底纹（2026-10-27）

- 背景：夏夏要求自适应宽度，仅保留可读下限；表格与输入区域应有细边框或浅斑马，避免白色区域难分。
- 思路：用户视角清楚分行与编辑范围；产品视角宽屏充分利用空间，窄屏保留可读宽度并内部滚动。
- 执行与变更树：AgentBDirect.tsx的Table改auto；展开口播/板书列各minWidth300，最小总宽由columns计算，取消1100固定值。AgentBDirect.css增加交替浅底、淡列线及口播/板书编辑区域边框，hover和focus反馈保留。
- 发现与确认：复用已安装Table.minWidth，无依赖；68个命名函数体未变。Check Agent常显、输入默认展开、原题字体规则保持。
- 验证：bunx tsc --noEmit、目标ESLint、PostCSS解析、diff与函数体对比通过；样例浏览器四档视口正文列均至少300px，桌面表格随宽度扩展，窄屏最小总宽918px，全折叠降至434px，恢复后回到918px。斑马颜色不同、列线及输入边框实测存在。
- 交互验证：音频菜单、行操作、增行、环节切换、键盘编辑、添加动作、列折叠/恢复通过；未捕获异常0，实际业务API请求0。
- 证据与接力棒：%TEMP%/agentb-adaptive-table-20261027/browser-proof.json、table-desktop.png及四档截图；已人工查看桌面样例。刷新复核真实长稿；真实模型/TTS/交付未调用，历史产物未清理。
## 条目 30 · 演播页每行之间停顿1秒（2026-10-27）

- 背景：甲方反馈连珠炮，小朋友没有消化时间；夏夏限定只改播放页，避免复杂改造。
- 思路：用户视角保留上一行画面供思考；产品视角停顿仅放在row之间，最后一行无需空等。
- 发现：compile将有音频/实测音频时长的gap设为0，onended直接切行；无声行虽然有gap数据，loop也未等待。暂停恢复原先重启整行，不能用于恢复停顿。
- 执行与变更树：public/row-player.html统一消费已有1000ms GAP；onended切到虚拟钟等待；loop消费gap，seek覆盖停顿；play复用seekTo恢复准确位置，pause取消旧动画帧。新增scripts/test-row-player-gap.mjs，业务源码仅改播放页，较本轮快照增加11行、删除12行。
- 验证：回归先失败4000!=5000，修改后通过；覆盖音频/无声行、停顿中暂停续播、音频内续播、进度拖动、换档、末行和重播。字体回归与动作白名单回归通过，语法/diff检查通过。
- 浏览器：独立Edge在实际/row-player.html解码3段本地300ms WAV，间隔1015ms、1013.6ms，总时长2900ms，未捕获异常0、API请求0。结束冻结位使用墙钟，允许一帧内误差；不是精确整数毫秒断言。隔离浏览器已关闭。
- 边界与接力棒：未调用真实TTS/模型/录制；不改写历史固化件。夏夏刷新演播页试听节奏；%TEMP%/row-player-gap-20261027/存修改前快照、浏览器检查脚本与browser-proof.json。D30、KI-021和两张主图同步。

## 条目31 · 版本优点吸收与干净提示词（2026-10-29）

- 背景：夏夏要求两个小agent分别比较xiu与2111业务流，汇总优点后落实到我们的2111；明确提示词像工作日志，示例不能删除。
- 思路：用户视角检查输入、编辑、试听、配音、演播、交付；产品视角按真实业务收益吸收模块，不以日期或文件大小判优，不整仓覆盖。提示词保留示例和接口，先消除互斥规则，再删除补丁履历与重复解释。
- 执行：两agent分别只读追踪业务链，主审按工作树统一CRLF比较，154相同/21差异/xiu独有22（限定src/server/scripts、两个播放器页及配置）。真正字体差异位于静态deliverable路由，非api/deliverable路由。子agent误写重复报告，主审归并到外层唯一对比文件并删除本轮重复产物。
- 代码变更：AgentB两套风格及Check提示词；superFilter、board-doctrine、mathAsrConverter、row-player数学镜像；timing、AgentBDirect、CheckResultModal；check-agent service/skillViolations；静态deliverable字体路由。新增5份聚焦回归脚本，未加依赖。
- 发现和确认：xiu中点/分数改进有效，但其行UID存在刷新碰撞、播放器贴排镜像遗漏、Check正则误报正常提问；均收口后才采用。共同3/4x20口播错读已在2111修复。按行ID与原口播回填配音，改稿删除拒收旧结果、重排回正确行；移除按索引平行音频缓存。
- 提示词证据：默认19,230至7,652字符；Check7,791至3,669字符。示例哈希回归锁住默认两块、板书规则两块、李永乐六块代码样例及完整风格附录；examples.js只删除示例后Task标签，示例内容不变。教学事实优先于示例数字，保留示例中的反例并明确不得模仿。
- 验证：node scripts/test-math-consistency.mjs、test-row-uid-stability.mjs、test-deliverable-fonts.mjs、test-prompt-cleanliness.mjs；bun scripts/test-check-teaching.mjs、test-action-whitelist.mjs、test-question-font.mjs；node scripts/test-question-font-player.mjs、test-row-player-gap.mjs通过。原函数/隔离VM/模拟网络证明代码行为，不等同真实LLM/TTS成功。
- 回归拦截：提取数学渲染时差异审查发现夹带xiu音频行gap=0，立即恢复原每行GAP=1000，原停顿回归再次通过。
- 验证限制：全量tsc完成，仅报既有Prisma客户端导出缺失；未执行真实模型、浏览器、TTS、录制或部署。xiu缺本机依赖导致部分旧脚本未执行；词面断言失败不能当作业务bug数量。
- 留痕与接力：D31、KI-022/023/024、PROJECT_STATE与两图/变更树同步。缓存截断和所选风格摘要作为后续独立小修，下一步用真实题目验证讲解质量，不在本轮引入题库或新框架。
- 最终复核补充：两个agent共核对25个保护区域原文不变；九份提示词源码的非示例部分由31,413至12,039字符（减少61.68%，非token数）。主审独立示例哈希回归、最终9组聚焦回归及目标ESLint均通过，git diff --check无空白错误。类型检查的唯一报告仍为PrismaClient导出缺失。

## 条目32 · 核心保留交叉巡检与窄修复（2026-10-29）

- 背景：夏夏要求小agent共同检查本轮精简是否删掉教学或业务核心。
- 思路：一位审查者对照HEAD核对教学语义，另一位核对编辑/Check/TTS/播放/字体/数学链路；主审检查真实接线、导出表和回归，按可复现场景修复。
- 发现：本轮读题正文遗漏不讲解不报答案及1—3处关键条件标记；分数正则不接收2x等单项式，2x/3退化为2艾克斯/3。旧李永乐规则有3点14读法冲突；新增小数系数边界还暴露逐位小数后x未识别。
- 代码变更：src/agent-b-v2/prompt.js加一条读题合同；skills/liyongle-elementary/speech-rules.js保留原样例并说明小数成品优先逐位读；src/lib/mathAsrConverter.js扩大分数原子和小数系数未知数匹配。scripts/test-prompt-cleanliness.mjs、test-math-consistency.mjs增加核心约束及5个代数分数输入。
- 验证：新断言先因缺读题/小数规则失败；2x/3先输出2艾克斯/3而失败，小数系数用例另捕获遗漏，修复后九组回归通过：prompt-cleanliness、math-consistency、row-uid-stability、check-teaching、deliverable-fonts、row-player-gap、question-font-player、question-font、action-whitelist；本轮三份源码ESLint退出0。原样例与附录哈希通过。
- 独立核验：提示词审查者确认修复覆盖两项并独立回归通过。运行审查者抽取旧/新真实函数验证Check请求中及结果打开后的编辑、重排、增删、板书、延迟和动作修改，28用例未复现覆盖新稿；运行链路结论限函数级。
- 事实边界：默认提示词运行长度更新为7,716字符；不以字数减少证明语义正确。18个改动源码导出未丢；首页、Step1、CSS、生成与检查服务端、离线模板未改。未请求真实业务API、未浏览器挂载、未录制、未重新全量类型/build、未提交推送。
- 留痕：D32、KI-025、PROJECT_STATE与架构图更新，变更树见架构图；缓存与Prisma仍沿用KI-023/024开放项。
- 接力棒：先实际验收读题标记、分步教学和真实口播；不要把局部回归绿误报为真实模型全链路通过。

- 运行审查最终签核：两行数学修复覆盖原回归；14组输入经过formatMathSpeechToChinese、polishRowsASR、batchPolishRowsMathAsr共42项断言及4项加减分数边界通过，分母带系数正确。另确认既有未知数后加减号口播残留，登记KI-026和projectmem #0017开放，不归为新增退化。

## 条目33 · 口播未知数改读 X（2026-10-29）

- 背景：夏夏确认艾克斯可以正常念 X，要求删除旧口播规则。
- 执行：修改 Agent B / 李永乐 / Check 口播规则；mathAsrConverter 将未知数转为 X；Check 仅拦截小写 x、×、·；回归样例和提示词守卫同步更新。
- 保留：无未知数乘法 x 与板书未知数大写 X、乘号 · 的区分不变。
- 验证：9组聚焦回归通过；新增 2X加3等于11 不触发符号违规、2x+3 仍触发；运行提示词不含“艾克斯”；数学分数与播放器对拍通过；目标 ESLint 退出0。
- 限制：未调用真实TTS；doc/skills-archive归档快照未改。

## 条目34 · 口播文稿 Markdown 导出入口前置（2026-10-29）

- 背景：甲方在交付下拉中找不到口播文稿 Markdown 导出，误以为产品没有该能力。
- 思路：用户视角需要在五字段执行表完成后立即看到导出动作；产品视角保留交付下拉中的分镜与 JSON，避免重复入口和导出逻辑分叉。
- 执行步骤：定位 `exportSpeech` 及五字段执行表顶部工具栏；新增“口播文稿 MD”按钮并绑定既有函数；从“交付与导出”菜单删除重复口播项；未改 Markdown 生成器、文件内容或依赖。
- 代码变更：`src/components/teaching/AgentBDirect.tsx`。
- 发现和确认：导出能力原本已存在，问题属于入口发现性；现有 `exportSpeech` 继续统一处理题目、模型、时间、字体和行数据。
- 验证结果：`npm exec eslint -- src/components/teaching/AgentBDirect.tsx` 通过；静态入口断言通过；`node scripts/test-row-uid-stability.mjs` 通过。未宣称浏览器下载链路已验收。
- 接力棒：浏览器刷新后生成五字段执行表，点击顶部按钮确认真实下载文件。


## 条目35 ? 生成物清理与业务参数审计（2026-10-29）

- 背景：工作树积累了 `.next`、日志、TTS 缓存、handoff 历史和交付实体，同时需要确认前后参数是否一致。
- 思路：先按业务引用建立 keep 集合，再删除可再生产物；对实体断链先恢复，不以文件名旧就删。
- 执行：修正 `cleanupHandler` 的 handoff/deliverable 路径；保留 current 指针、当前实体及 `screenshotUrl`/`audioUrl`/`mp3`/`audio` 引用；加入 handoff 历史清理；实际清理 93 个过期文件。
- 数据修复：`var/deliverable/current.json` 的 JSON 实体已经丢失，从 `current.html` 内嵌 payload 恢复 JSON 与同名 HTML，`readCurrentDeliverable()` 现可读取。
- 参数审计：`problemText`、`boardPlan`、`canvasParams`、`audioUrl`、`audioDurationMs`主链可追；发现 `rowGapMs`/演播 GAP、Check 数组索引合并、`coordinateSystem`/`coordinateMode` 双命名、`stageRatioSuggestion`/`环节配比占比` 双写。
- 验证：`node scripts/test-cleanup-contract.mjs`通过；`node scripts/test-row-uid-stability.mjs`通过；`npm exec eslint -- scripts/test-cleanup-contract.mjs` 通过。未宣称行播首字问题已解决。
- 接力棒：下轮修正演播首字播放门、统一 gap 配置、Check row identity。

## 2026-10-29 · 生成物清理与业务参数归一（条目36）

- 背景：清理过期产物后，核对前端时间轴、交付物和独立演播页是否仍使用同一参数规则。
- 思路：沿 Step1Entry -> handoff -> AgentBDirect -> timing -> deliverable -> row-player 追踪字段；只修复已确认的共享参数分叉。
- 执行步骤：修正清理器真实存储路径；保留 current 指针、实体和引用资产；补回断链交付 JSON/HTML；将 owGapMs 写入 uiSettings；统一所有行的行间停顿；移除 seekTo 直接播放绕过。
- 代码变更：server/cleanupHandler.js、src/agent-b-v2/timing.js、src/components/teaching/AgentBDirect.tsx、public/row-player.html；同步更新架构图和问题记录。
- 发现和确认：旧差异是 timing 音频行 gap=0、演播页固定 1000ms；旧试听缺口是 seekTo 末尾直接 udioEl.play()。
- 验证结果：清理契约、行播放器、行ID、数学、提示词回归通过；git diff --check 和 cleanup 语法检查通过。
- 接力棒：补做真实题图快照；Check 回写改为按 _rowUid 合并。

## 条目37 · 恢复 Windows 本地启动（2026-10-29）

- 背景：夏夏反馈当前项目无法运行，需要实际启动并提供可访问地址。
- 思路：核对本目录、四层结构与启动链，复用声明依赖及 Next.js 原生入口。
- 执行：确认 next 为 MODULE_NOT_FOUND、node_modules 不存在；Bun 安装依赖。复现 tee 管道将左侧退出7掩盖成0，移除该管道。Prisma postinstall 等待超过35分钟后终止该安装进程，以 bun install --ignore-scripts 完成安装并生成锁文件；后台启动并用独立 Edge 配置检查。
- 代码变更：package.json 的 dev；新增 bun.lock；更新 .zscripts/dev.pid、README.md、四份核心记录与 KNOWN_ISSUES.md。Next.js 自动生成 AGENTS.md；node_modules、.next、*.log 为可再生产物。
- 发现与确认：本轮按原有范围解析 Next.js 16.4.3、React 19.3.1；Prisma 仅在未被业务调用的 src/lib/db.ts 定义。未更改题目存档、音频或生成逻辑。
- 验证：依赖安装和 dev 帮助命令退出0；首页200。Edge 1440×1000 中 React 已挂载、6个按钮、5个输入、脚本异常0、业务API请求0。截图：%TEMP%/qinghuabu-startup-20261029.png；检查脚本：同目录 qinghuabu-startup-browser-20261029.cjs。开发日志：dev.out.log / dev.err.log。
- 接力棒：服务保持后台运行，地址 http://127.0.0.1:3000/。数据库生成、真实AI/TTS、录制与生产构建未验收。

- 补充验证：3000 已被本轮服务占用时，再运行 npm run dev 明确显示 EADDRINUSE 且退出1，确认错误退出码不再被管道掩盖。bun install --frozen-lockfile --ignore-scripts 退出0，无依赖变化；git diff --check 通过；四类项目缓存已失效（原键不存在）。

## 条目38 · lite player 四区标签常驻（2026-10-29）

- 背景：甲方要求录制画面中的题目、分析、解答、总结四区标签长久显示，不再随讲解进度逐区出现；用户调整布局后标签必须停在调整位置。
- 思路：位置链已正确读取 `boardPlan`，仅删除 `drawStageTag` 的时间显隐门和弹出缩放，禁止触碰布局、录制、题目、播放和板书链。
- 执行：修改 `public/row-player.html`；扩充 `scripts/test-question-font-player.mjs`，用非默认 Label 坐标验证第 0 帧四枚标签全部绘制及位置跟随。
- 代码变更：2 个文件；播放器删除 7 行时序逻辑，未新增状态、配置或依赖。
- 发现与确认：拖动结束会重新 `compile(DATA)`，`resolveTagAnchor` 从当前 `boardPlan` 读取 Label 坐标，因此无需新增录制时快照或变更追踪。
- 验证：播放器与离线导出标签回归通过；`test-row-player-gap`、`test-action-whitelist` 通过；目标 ESLint 通过；真实 Edge 第 0 帧和 73% 时间点均绘制 4 枚标签，坐标为模拟拖动后的值，脚本异常 0。截图：`%TEMP%/qinghuabu-lite-labels-20261029.png`。
- 接力棒：保持本次只改标签显示的边界；真实系统录屏权限未触发，标签本身已在被录制的主 canvas 全时段绘制。

## 条目39 · GitHub 私有同步与推送（2026-10-29）

- 背景：夏夏无法推送 GitHub；本地与远端 main 各有 3 个独有提交，仓库当时公开且本地待推历史包含预设服务密钥。
- 思路：先将仓库转 Private；在隔离 worktree 中保留双方提交历史，但采用本地已验收快照，避免远端旧代码回灌；最后推送并用 GitHub API 核验。
- 执行：通过本机 GitHub 登录将 `zo4xia/2111` 转为 Private；建立备份分支与隔离 worktree；远端旧快照存在大量冲突，改用 ours 合并保留历史父链，再 cherry-pick lite player 标签修复；使用内存 credential helper 推送，未将凭据写入参数、文件或仓库。
- 代码变更：远端 main 接收合并提交与标签修复；本地 main 对齐远端。未纳入 `src/check-agent/prompt.js` 的既有工作树修改。
- 发现与确认：Fish Audio 预设密钥 2 枚仍在私有仓库 `.env`；聊天中的 GitHub token 未进入 `.env`。GitHub 报告默认分支现有 3 个 high Dependabot 漏洞，本轮未扩展处理。
- 验证：GitHub API 返回 `private=true`、`visibility=private`、main=`656b10e`；播放器/离线导出标签回归、行间停顿、动作白名单、目标 ESLint 通过；本机 HTTP 模板与磁盘 SHA256 一致。
- 接力棒：立即撤销聊天中暴露的 GitHub token并换新；依赖漏洞另开任务处理，不与本次标签微调混做。

---

## 2026-10-29 · 发布域名音频 404 根治 + 零域名限制生产化（会话恢复重建）

**背景**：工作区被整体重置（仅剩平台空壳），从用户 GitHub 快照（zo4xia/2111，02:41 最后提交）+ upload 原始 ZIP 恢复。发布域名 tttsss3.space-z.ai 音频全挂。

**诊断链**（全部实测取证）：
1. 发布域名 `POST /api/tts/synthesize` 200（合成成功、密钥轮换正常）→ 排除密钥/接口层；
2. 紧接着 `GET` 返回的 audioUrl → 404；连仓库既有缓存文件也 404；
3. 同域 `/snapdom.js`、`/fonts/*`、`/_next/static/*` 全部 200 → public 静态服务在跑但只认构建时清单；
4. 结论：Next.js 生产/standalone 模式不服务运行期写入 public/ 的文件（叠加纯净版 ZIP 清空缓存目录）。

**修复**：
- `src/app/api/asset/[...path]/route.ts` 动态资产路由（读盘 + Range 206 + ETag + 防穿越 + 分目录缓存策略）；
- `next.config.ts`：**删除 allowedDevOrigins（零域名限制）** + beforeFiles 重写四目录（注意：destination 必须带目录前缀，`/api/asset/:path*` 会丢段——本次踩过并当场修正）；
- `scripts/prod-serve.sh`：setsid 双 fork 守护 + standalone 组装（var/doc/四个资产目录 symlink 直连项目真身，重建不丢数据）+ 杂物清理 + dev.log 轮转；
- `package.json`：dev/start → prod-serve.sh（平台 `bun run dev` 自动落生产模式）；
- `.zscripts/build.sh`：打包补 doc/ + var/，清理追踪杂物（防 140MB 膨胀包）。

**验证**：合成→播放→Range→落盘全链路 200；三域名 Origin 模拟全 200；agent-browser 全页渲染零错误、核心交互（输入→按钮激活）通过；跨工具调用进程存活（setsid）。

**遗留事项**：发布域名 tttsss3.space-z.ai 是重置前构建的独立部署，需用户在平台**重新发布**才能吃到本次修复。

## 条目40 · Prisma 拆除 + 三路勘探纠偏 + 记忆固化建制（2026-10-30）

- **Prisma 死基建拆除（KI-004 收口）**：零活引用实证（@/lib/db 全仓无 import）后拆除 prisma/、src/lib/db.ts、db/custom.db、4 条 db:* 脚本与 .env DATABASE_URL；平台链契约（.zscripts set -e 依赖 bun run db:push + db 文件存在校验）以零依赖桩 scripts/db-ensure.mjs 顶住；restore-from-repo.sh 同步清理；node_modules 孤儿目录物理清除。
- **三路 Agent 并行勘探**（2-a 后端全链 / 2-b 前端可疑点+考古 / 2-c 测试图谱审计）：
  - 2-a：13 条 API 路由 route→compat→handler→真源全链走通，standalone trace 20/20 零缺失；**揪出 P0 路径穿越×2**（/handoff 任意文件读取可拖 .env 密钥、/deliverable 拖全仓 json/md，均实测复现）。
  - 2-b：组件→API 映射成表；12 处 fetch 无超时/静默吞错/双真源立案（KI-038/KI-039）；**sessionid+loop 考古结论：本仓不存在**（全仓+git 全史+上传 ZIP 零命中，疑在 KI-022 记载的"xiu 副本"，立案 KI-037 待指认）。
  - 2-c：10 项测试 9 PASS 1 FAIL；FAIL 判定为附录哈希 pin 过期（提示词有意编辑后未刷新，非业务回归）；lint 已复通（KI-001 关闭，7 条真实错误另立 KI-036）。
- **P0 穿越修复（KI-034）**：/handoff 与 /deliverable 补双层防线（逐段校验 + resolve 前缀强校验，基准目录由 handler 导出单一真源）；攻击链全 404、正常档/字体零误杀（实测）；新增 test-handoff-route.mjs + test-deliverable-fonts 顶层攻击用例双回归。修复过程同步修正测试桩缺口与一处 TDZ 顺序缺陷。
- **测试图谱刷新（KI-035）**：附录 pin 白名单化（沿用 fenced 样例先例），全量 11 项测试 PASS。
- **埋点建制**：12 条 API 路由 + 2 静态路由 + compat 桥共 15 处 [TAG:] 标签，rg "[TAG:" 一键拉全业务脉络。
- **记忆固化建制**：doc/BUSINESS_FLOW.md（架构/时序/数据流/API 映射/测试图谱 Mermaid 全家桶）+ doc/AGENT_PLAYBOOK.md（Agent 错题集与自我修养指南，含本轮全部现场坑：ESM require、正则锚点行中事故、测试桩演进、TDZ、孤儿目录、平台契约链、双 fork 保活等 13 条）+ KNOWN_ISSUES.md 补录 KI-034~039。
- **事故与自纠**：批量插桩正则锚点停在行中弄坏 12 文件（当场修复+复核+入错题集）；错题编号撞车 10-29 轮已占用的 KI-024~029（重排为 034~039，全仓交叉引用同步，铁律入册）。
- 验收：build PASS · 健康检查 ✓ · 攻击链 404×5 · 正常功能零误杀 · 11 测试全 PASS · 服务在线（daemonize 保活）。

## 条目41 · GitHub 完整备份落库 + 交接纠偏 + 降噪清仓（2026-10-30）

- **GitHub 完整备份（用户指令：先完整推送，不然没了就没了）**：token 验证账号 zo4xia；本地 4 提交（含条目40 全部成果）推送至 `zo4xia/2111` 新分支 `20261030`；远端 SHA = 本地 a21fdc7，334 文件树经 GitHub API 逐项核验（.env、守护脚本、记忆文档、handoff 运行数据全在）。
- **仓库转私有（纠偏决策）**：2111 原为**公有**仓库，而本仓 `.env` 与 `server/fishAudioHandler.js` 内置密钥均在 git 树内——直接推 = 密钥公开裸奔（KI-002 风险面扩大）。已先 `PATCH visibility→private` 再推；操作可逆，**公开回去前必须先密钥轮换 + git 历史清洗**（已同步记入 KI-002 状态更新）。
- **零破坏分支策略**：远端 main 是另一条历史（用户 10-29 网页手动上传的 "Add files via upload" 快照，仅远端这一份），与本地历史无共同祖先——强推会毁孤本。故只建新分支 20261030 承载全部现状，远端 main/live/vue-legacy 原样保留。
- **交接纠偏**：交接摘要滞后于实际进度——摘要称 Prisma 拆除"未开始"，实为上轮尾巴已完成并提交（a21fdc7 即拆除提交）。教训：动手前 `git log --stat` + `git status` 核实，以文件系统与 git 为唯一事实源（Playbook §14）。
- **降噪清仓**：`tool-results/`（勘探 agent 工具输出残渣 263KB，内容为现存文件的冗余 dump，教训已蒸馏入 Playbook）出库并加 .gitignore；`.prod-serve.pid`（运行时 pid，每次守护重启都会变）转 untracked + ignore；本轮临时验证文件（remote_tree_check.json / dependabot_check.json）即用即删。
- **回归复核（备份前后各一轮）**：node 系 8 项 + bun 系 3 项 = **11/11 PASS**；守护进程跨会话存活（pid 6649，health/page OK）——双 fork 保活经受住会话更替实战验证。
- **推送回执新情报**：GitHub 报 3 条 Dependabot high 告警，全指向 `sharp`（<0.35.0/<0.35.4/<0.35.5）。已核实为模板遗留死依赖（全仓零 import、零 next/image、零契约引用），转条目42 手术处理。
- **prod-serve.sh 移植性警示落注**：P 硬编码沙箱路径，头部补"换机必须先改"标注（上轮已识别、本轮补账）。
- 错题微记：`du` 报 exit=1 是因 prisma/ 目录已不存在——工具报错先分清"预期消失"还是"意外缺失"，这回它恰好是"拆除已完成"的情报信号，不是故障。

## 条目42 · sharp 死依赖拆除（Dependabot 3×high 收口，KI-040）（2026-10-30）

- **来源**：条目41 推送回执暴露 3 条 Dependabot high（sharp <0.35.0/<0.35.4/<0.35.5），指向 package.json 直接依赖 `sharp@^0.34.3`（实装 0.34.5）。
- **拆除依据（先证后拆）**：全仓零 import、零 `next/image`、next.config 零引用、`.zscripts/`+Caddyfile+scripts 零契约引用（排除 db:push 同款平台雷）；Next 自带 `next/sharp` 可选解析（0.35.5 已修补）不随直接依赖走——判定为模板遗留死依赖，与 Prisma 同性质（KI-040）。
- **执行**：package.json 删行 → `bun install`（Removed:1；lockfile 仅剩 sharp@0.35.5 单一解析，@img 原生件全对齐 0.35.5）→ 停守护 → `bun run build` PASS → 守护重启（新 pid 8209）。
- **验收**：health ✓ · page ✓ · TTS keyCount=3 · 网关 :81 200 · /api/asset 200/34KB 实文件 · **11/11 测试 PASS**。
- **顺带记录**：远端 main（10-29 网页上传旧快照）上的 3 条告警将在 20261030 分支合入或设为默认后自然消除。

## 条目43 · checkagent/agentb 提示词全量归一化（四条教学铁律落死）（2026-10-30）

- **需求（用户四条铁律）**：①循序渐进不跳步；②一步一 row、勿堆步骤（音画节奏）；③解题关键公式写进分析区（知识点唤醒/复习）；④苏格拉底式递进引导 ≠ 故意犯错误导，严禁故意讲错（防带偏思路 + OOC）。
- **全量遍历**：agentb 基座版 prompt.js（default-fallback，运行时默认）+ liyongle 技能版七模块（可选 skillId）+ checkagent prompt.js + 检测引擎 skillViolations.js + 两个 handler 装配链 + 11 项测试对提示词的全部断言。
- **诊断**：编号三套混用（1→四→二→五→8）；四环教学法写两遍且第二遍缺环4筛网归题；两份"输出前检查"；小数读法严格版与宽松版并存冲突；"附录 8.6 第 2 条演错重来"过期引用（该条前轮已被替换）；字段表 teachingFocus 空单元格；four-rings.js "简单题几步揉一行"与铁律2正面冲突；附录示例中文数字（十二厘米）违反自家口播规则；check 侧读法区杂物抽屉（孤悬 1.2 编号 + 错挂 reason 示例）。
- **重构（锚点切片脚本，围栏示例块与附录锚点字节不动）**：
  - 基座版：0 人设态度 / 1 输入说明(1.1-1.3) / 2 四环（唯一版本，环1-4 齐全）/ **3 四条教学铁律** / 4 输出格式 / 5 口播读法与板书符号（归一为逐位读法）/ 6 起笔节点与动作 / 7 输出前检查（合并双检查表）/ 示例使用边界 / 8. 附录（数字口播统一阿拉伯数字、补齐悬空引号——白名单登记第 3 哈希 3d4b3489…）。13,451 → 12,034 字符（去重净减）。
  - liyongle 版：环1 前插四条铁律；"几步揉一行"反转为"环节可揉、步骤不揉"；speech-rules 小数读法自相矛盾归一（3点一四逐位）；output-format 核对加不跳步；persona 引导方式挂钩铁律；examples 注释过期 §5.2 引用改锚。
  - checkagent 版：新增"教学铁律复核（四条）"节（与生成侧同口径：跳步/挤行/公式缺失→structure 建议、演错→speech/answer_error）；读法区拆归三类（读法规范/运算符读法/板书口播对照）；孤悬 reason 示例归位输出格式。
- **回归**：test-prompt-cleanliness 新增铁律语义断言（双版生成侧 + check 侧同口径）+ 附录白名单第 3 哈希登记（KI-035 流程）；**11/11 全 PASS**。
- **部署**：重建 standalone + 守护重启（pid 9000），五项验收全绿（health/TTS keyCount=3/网关 200/资产 200/首页 OK）。
- **副作用备忘**：useBCache 的 promptVersionDigest 随提示词变更换算——旧 B 生成缓存自然失效重建，属预期行为。
- **错题**：大块 old_str 逐字 Edit 因不可见字符（弯引号/省略号形态）整批原子回滚 → 改锚点切片脚本法（唯一锚点 + 保留区字节不动 + 修正逐条 assert 命中计数）入册 Playbook §17；doc/skills-archive/ 为死档案未动。
