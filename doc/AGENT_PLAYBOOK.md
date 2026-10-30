# AGENT_PLAYBOOK · 错题集与自我修养指南

> **给所有接手本项目的 Agent（也给未来的自己）。**
> 宗旨：每踩一个坑、每调通一个新工具/新链路，**当场写进本文件**——不写等于没做。
> 记录格式：`坑的现象 → 根因 → 解法 → 同款排查（全仓搜过没有第二处吗）`。
> Leader 视角三问（每次收工前过一遍）：主线推进了吗？小债当场还了吗？这坑下次还会踩吗？

---

## 一、环境篇 · z-ai 沙箱特性（血泪换来的）

### 1. 后台进程会被工具调用回收 → 双 fork 守护
- **现象**：`nohup bash ... &`、`setsid ... &` 启动的服务，工具调用一结束进程就消失（端口 3000 掉线），日志无任何报错。
- **根因**：Bash 会话是 `su z` 的子进程，调用结束整棵进程树被回收；`setsid` 只换会话不换父进程归属。
- **解法**：`python3 scripts/daemonize_prod.py start`（双 fork → 子进程立即过继给 PID 1，PPID=1 + 独立 session，实测跨调用存活）。stop/status 同脚本。
- **同款排查**：任何"需要常驻"的服务都必须走该脚本；平台自带的 `.zscripts/dev.sh` 托管链只在**容器启动时 package.json 已在位**才会自动拉起（上传 zip 恢复的场景第一轮不满足）。

### 2. 平台契约链不可裸删（.zscripts 的隐藏调用）
- **现象**：拆 Prisma 时若直接删掉 `db:push` 脚本或 db 文件，平台重建/发布链会硬炸。
- **根因**：`.zscripts/dev.sh` 与 `.zscripts/build.sh:162 → database-runtime-build.sh` 都在 `set -e` 下调 `bun run db:push`，后者还强校验"DATABASE_URL 指向的文件必须存在"。
- **解法**：删本体前先写**契约桩**顶住语义——`scripts/db-ensure.mjs`（零依赖，幂等，确保 SQLite 文件在位）。平台重置后它会重建空的 `db/custom.db`，**这是预期产物，不是 Prisma 死灰复燃**。
- **同款排查**：删除任何 package.json script 前，先 `rg "脚本名" .zscripts/ scripts/` 搜平台链引用。

### 3. bun remove / 依赖剔除会留孤儿目录
- **现象**：lockfile 已零引用，`node_modules/@prisma`、`node_modules/prisma` 仍完整躺在盘上。
- **解法**：`bun pm why <pkg>` 确认依赖图确无引用后，手动 `rm -rf` 孤儿目录。判定顺序：先 lockfile 后 node_modules，两处都清才算斩草除根。

## 二、代码篇 · 本项目高频雷区

### 4. `.mjs` 文件里写 `require` → ReferenceError
- **现象**：`node scripts/db-ensure.mjs` 炸 `require is not defined in ES module scope`。
- **根因**：`.mjs` = ESM，必须用 `import`。
- **同款排查**：`rg "require\(" scripts/ src/lib/ --glob '*.mjs'`；新写脚本先定运行时（node=ESM/CJS 看后缀，bun=两者都行）。

### 5. 正则锚点停在行中间 → 批量插注释弄坏 12 个文件
- **现象**：批量插 `[TAG:]` 后，12 个 route.ts 变成 `export const dynamic\n\n// [TAG:...] = 'force-dynamic'`——`= 'force-dynamic'` 被吸进注释行，语法全炸。
- **根因**：`re.search(r'^export const dynamic').end()` 停在匹配串末尾=**行中间**，不是行尾。
- **解法**：批量文本插入必须锚定**整行**：`re.search(r'^export const dynamic.*$', re.M)`，插完必须抽样 `sed -n` 肉眼复核 + 编译验证。
- **同款排查**：任何"脚本批量改源码"收工三件套：抽检 → 全量 rg 复核 → build。

### 6. 测试桩跟不上接口演进 → 防线误杀一切
- **现象**：给 `/deliverable` 路由加前缀二次防线后，test-deliverable-fonts 全 404 崩溃。
- **根因**：vm 桩只 mock 了 `fullPath`，新导入的 `DELIVERABLE_BASE_DIR` 在桩里是 `undefined` → `startsWith('undefined/')` 恒 false。
- **解法**：接口加了导出，消费方（含测试桩）必须同步供给。**修产品前先想清楚测试桩在哪、要不要一起改**。
- **同款排查**：`rg "模块名" scripts/test-*.mjs` 找所有 stub 该模块的测试。

### 7. const 箭头函数在定义前使用 → TDZ 运行时炸
- **现象**：`notFoundJson` 先被调用后定义，段校验一触发就 ReferenceError。
- **铁律**：辅助函数要么 `function` 声明（可提升），要么放 GET 顶部；改完必须把"校验分支真触发"的路径实测一遍（光过 build 不够，`ignoreBuildErrors: true` 会放过类型错）。

### 8. 路径穿越是本项目的历史病（发现一处必须全仓搜同款）
- **已发三个案发点**：`/handoff/[name]`（曾实测拖出 .env 密钥全文）、`/deliverable/[[...name]]`（曾拖全仓 json/md）、（对照：`/api/asset` 一直有双层防线，是正面样板）。
- **修复配方（新写静态路由必须照抄）**：①逐段拒绝 空/`.`/`..`/斜杠/反斜杠/`\0`；②`resolve` 后强校验 `startsWith(BASE + '/')`，BASE 从 handler 导出（单一真源，防 cwd 口径漂移）。
- **回归测试**：test-handoff-route.mjs / test-deliverable-fonts.mjs 内置攻击向量清单，新增攻击面时同步补用例。

### 9. NEXT_PUBLIC_* 是构建期内联，不是运行时读
- **现象**：改 `.env` 的 `NEXT_PUBLIC_AI_API_ENDPOINT` 后前端行为不变。
- **根因**：Next 把 NEXT_PUBLIC_ 变量在**构建时**烧进浏览器包；standalone 运行时改 .env 无效。
- **本项目正解**：大模型配置走页面「Agent 配置」抽屉（localStorage 持久化，键见 BUSINESS_FLOW）；TTS 密钥走服务端 env（.env + 代码兜底池双保险）。

### 10. `DATABASE_URL=file:/home/z/...` 绝对路径 & 全角逗号
- 绝对路径是脚手架遗留，本仓已随 Prisma 拆除清除（KI-004）。
- `.env` 多 key 分隔混用全角`，`/半角`,`：`parseKeyList` 已宽容（server/fishAudioHandler.js:50），勿"修复"回去。

## 三、验收篇 · SOP

### 11. 收工五步（DEPLOY.md 口径 + 回归）
```bash
python3 scripts/daemonize_prod.py status                      # ① 服务活着
curl -s :3000/api/health                                      # ② 健康检查
curl -s :3000/api/tts/info | head -c 200                      # ③ TTS keyCount=3
node scripts/test-handoff-route.mjs && node scripts/test-deliverable-fonts.mjs   # ④ 穿越回归
# ⑤ 改过生成链路必须全量跑：node 系 7 个 + bun 系 3 个（见 BUSINESS_FLOW §4）
```

### 12. lint 现状（KI-001 已复核降级）
`bun run lint` 现已可用；现存 7 条真实错误集中在 React hooks 规则（set-state-in-effect、refs during render），见 KI-036，**属下轮治理项，本轮不动渲染逻辑**。

### 13. 测试运行时双轨制
- **node 跑**：test-cleanup-contract / deliverable-fonts / math-consistency / prompt-cleanliness / question-font-player / row-player-gap / row-uid-stability / handoff-route
- **必须 bun 跑**：test-action-whitelist / check-teaching / question-font（依赖 `bun:test` 的 mock.module；node 会炸 `ERR_UNSUPPORTED_ESM_URL_SCHEME: 'bun:'`）。⚠ 调用姿势：`bun scripts/test-x.mjs` 直跑——`bun test` 有文件名门槛（要 .test/_test_/.spec 后缀），对 `test-*` 前缀文件直接拒跑

## 四、复盘篇 · 本轮（2026-10-30）修复实时台账

| 事项 | 状态 | 证据锚点 |
|---|---|---|
| Prisma 死基建拆除 | ✅ | lockfile 零引用 + db-ensure 契约桩 + build PASS |
| /handoff、/deliverable 路径穿越（P0） | ✅ 已修+回归测试 | 攻击链全 404、正常档零误杀（实测） |
| 15 处 [TAG:] 埋点 | ✅ | `rg "\[TAG:" src/` 可拉全脉络 |
| test-prompt-cleanliness 附录 pin 过期 | ✅ 白名单化 | 语义断言全数成立后刷新 |
| sessionid+loop 上下文携带 | ⚠ **未在本仓找到** | 全仓+git 全史+上传 zip 零命中，疑落在"xiu 副本"（KI-022 记载多副本并存），待用户指认后补记 |
| 前端 12 处 fetch 无超时 / 静默吞错 / TTS 双真源 | 📋 已立案 | KI-038/KI-039，下轮治理 |
| 识别/TTS服务端/录制 测试红区 | 📋 已立案 | BUSINESS_FLOW §4 |
| sharp 死依赖拆除（Dependabot 3×high，KI-040） | ✅ | 零消费实证 + lockfile 单一 0.35.5 + build PASS + 11/11 |
| checkagent/agentb 提示词归一化（四铁律，KI-041） | ✅ | 双版同口径 + 附录白名单第3哈希 + 11/11 PASS |

## 五、交接篇 · 跨会话/跨仓（2026-10-30 增）

### 14. 交接摘要可能滞后于实际进度——动手前先验 git 树
- **现象**：交接摘要称 Prisma 拆除"未开始"，实则上轮尾巴已完成并提交（重做 = 白担一轮手术风险）。
- **解法**：接手第一件事 `git log --stat -5` + `git status` + rg 关键物是否在库——**文件系统与 git 是唯一事实源**，二手信息（摘要/诊断/旧文档）一律交叉验证后再行动。
- **微记**：`du` 报 exit=1 是因 prisma/ 已不存在——工具报错先分清"预期消失"还是"意外缺失"，别当故障修。

### 15. bun test 有文件名门槛，`test-*` 前缀文件用 `bun <file>` 直跑
- **现象**：`bun test scripts/test-action-whitelist.mjs` 报 "Tests need .test/.spec in filename"。
- **解法**：`bun scripts/test-action-whitelist.mjs` 直接执行即可跑 bun:test 系脚本（§13 口径已同步）。

### 16. Dependabot 告警先查消费方——零消费删，有消费升
- **现象**：推送回执 3 条 high 全指向 sharp；核查发现全仓零 import、零 next/image——模板遗留死依赖。
- **解法**：删直接依赖（lockfile 只剩 next 自带可选解析 sharp@0.35.5 已修补），不盲目 `bun add sharp@latest`。与 Prisma 拆除（KI-004）同款判断题，结论相反——先证后拆，证据决定删还是升。
- **同款排查**：见新 CVE/告警 → rg 全仓 import + 平台链（.zscripts/scripts）→ 零命中即拆，有命中才评估升级。

### 17. 提示词重构：先锁契约块，再用锚点切片（勿整块逐字 Edit）
- **现象**：对 prompt.js 做 MultiEdit，大块 old_str 因弯引号/省略号/不可见字符失配，整批原子回滚。
- **解法**：围栏示例与附录被测试哈希钉死——重构用锚点切片脚本（唯一锚点定位 + 保留区字节不动 + 修正逐条 assert 命中计数），改完先跑 test-prompt-cleanliness 验证钉死块未动，再按 KI-035 流程登记新哈希。
- **同款排查**：改任何"有测试钉哈希"的文件前，先读对应测试看哪些区被钉死；这些区域脚本切片保留，其余散文区才可自由改写。

> **给下一个 Agent 的第一件事**：读本文件 + `doc/BUSINESS_FLOW.md` + `KNOWN_ISSUES.md`，再动代码。发现新坑，先修再记，记完全仓搜同款。
