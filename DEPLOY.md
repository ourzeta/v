# 部署与交付标准 — 青花布讲题视频工作台

> 面向接手人 / 运维 / 交付负责人。本文 = 两种交付物的标准 + 部署全流程 + 验收口径。
> 原则：**没有验证过的代码不要说"好了"**——一切以本文验收口径为准。
> 基准：`qinghuabu-teaching-workbench 1.0.0` · Next.js 16.1.3（App Router + Turbopack）· 2026-10-26

---

## 零、解压即用（3 步上手）

> 拿到 `qinghuabu-teaching-workbench-*.tar.gz` 后，最快跑起来的路径：

```bash
# 1. 解压
tar xzf qinghuabu-teaching-workbench-*.tar.gz
cd qinghuabu-teaching-workbench-*/standalone

# 2. 启动（端口默认 3000，可改 PORT=xxxx）
node server.js          # 或: bun server.js

# 3. 浏览器打开
#    http://localhost:3000        工作台首页
#    http://localhost:3000/api/health   健康检查（返回 "ok": true 即成功）
```

**前置条件**：只需 Node.js ≥ 20（无需 bun，无需联网安装依赖——standalone 已自带精简 node_modules）。
**预设 Key**：代码内置 Fish Audio 音色与大模型 Key，开箱即可用；要换 Key 见下方「三、环境变量清单」。
**数据库**：当前版本无需数据库即可运行（Prisma 仅作基础设施预留）。

---

## 一、两种交付物（先分清）

| | 成品交付包（ZIP） | 程序交付包（tar.gz） |
|---|---|---|
| **给谁** | 最终客户（老师/机构） | 部署运维（自建服务器） |
| **内容** | 单题微课：播放页+音频+题目图+验收清单 | 完整程序：standalone 运行时+部署说明 |
| **怎么产** | 工作台 Agent B 弹窗「下载标准交付包 (ZIP)」<br>或 `GET /api/deliverable/export?projectCode=xxx` | `bash scripts/build-release.sh` |
| **验收** | 包内 `manifest.json` 的 files[].md5 | `md5sum -c manifest.md5` |
| **使用** | 解压 → 双击 `board/*.html` 即播（离线可用） | 解压 → `node standalone/server.js` |

### 成品交付包结构（格式 v1）

```
deliverable-{项目编码}/
  board/deliverable-{编码}.html   播放页（内嵌播放器+数据，入口）
  audio-cache/*.mp3               行口播音频（与 board/ 同级，勿拆散）
  pic/*.jpg                       题目图（同上）
  data/deliverable-{编码}.json    工程规格（对接/二次开发用）
  manifest.json                   交付清单（bytes+md5；missing/external 如实披露）
  README.txt                      客户使用说明（UTF-8 BOM，含 webm→MP4 转换指引）
```

- 播放页内资源引用为相对路径（`../audio-cache/`），**http 与 file:// 双击双协议均可命中**，离线可用（板书字体 CDN 需联网，离线回退系统手写字体）。
- `manifest.json` 的 `missing` 数组 = 档里引用了但文件已被清理的资源（如 cleanup 后的题目图）——**导出时如实披露，不炸包**；`external` = 外链资源（不入包）。
- 验收脚本口径：逐文件核对 `bytes` + `md5`（manifest 不含自身，自指不成立）。

---

## 二、环境要求

| 项 | 要求 |
|---|---|
| Node.js | ≥ 20（bun ≥ 1.x 更佳，本仓锁文件为 bun.lock） |
| 端口 | 3000（单端口，全部 API/页面同源） |
| 系统 | Linux / macOS / Windows（standalone 自带精简 node_modules） |

## 三、环境变量清单（.env / .env.local）

> 优先级：`.env.local` > `.env`；两文件均被 `.gitignore` 覆盖，密钥不进版本库。

| 变量 | 用途 | 缺省行为 |
|---|---|---|
| `FISH_AUDIO_API_BASE_URL` | Fish Audio TTS 接入点 | `https://api.fish.audio` |
| `FISH_AUDIO_API_KEYS` | TTS 密钥（**多枚半角逗号分隔，逐请求轮询+故障自动切换**） | 未配置则 TTS 合成不可用（页面明确报错） |
| `FISH_AUDIO_MODEL` | TTS 模型 | `s2.1-pro-free` |
| `FISH_AUDIO_REFERENCE_ID` | 复刻音色参考 | 内置默认 |
| `NEXT_PUBLIC_AI_API_ENDPOINT` | Agent A/B 大模型接入点（前端读） | 用户在工作台「Agent 配置」抽屉填写（localStorage 持久化） |
| `NEXT_PUBLIC_AI_API_KEY` | 大模型密钥（前端读） | 同上 |
| `NEXT_PUBLIC_AI_API_MODEL` | 多模态识别模型名（前端读） | 同上 |
| `NEXT_PUBLIC_AI_CHECK_MODEL` | 审校 Agent 专用模型（前端读） | 同上 |
| `DATABASE_URL` | Prisma（当前未启用业务表，模板基础设施） | 无影响 |

> 大模型密钥可走 env 预设，也可走页面配置（后者优先，适合逐客户交付）。TTS 密钥**只走 env**。

## 四、启动

**开发模式**（沙箱/本机）：
```bash
bun install
bun run dev          # http://localhost:3000，dev.log 实时日志
```

**生产模式**（standalone，推荐交付形态）：
```bash
bash scripts/build-release.sh          # 产 .release/*.tar.gz（内含 standalone+DEPLOY.md+VERSION+manifest.md5）
# 部署机上：
tar xzf qinghuabu-teaching-workbench-1.0.0-*.tar.gz
cd qinghuabu-teaching-workbench-*/standalone
cp ../DEPLOY.md . 2>/dev/null; export PORT=3000   # 或用反代
node server.js        # 或: bun server.js
```

## 五、反向代理（对外只暴露一个端口）

Caddy 最小示例：
```
example.com {
    reverse_proxy localhost:3000
}
```
Nginx 最小示例：
```
location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_http_version 1.1; }
```
> WebSocket 当前未使用（全部交互为 HTTP API），无需 upgrade 配置。

## 六、目录职责

| 目录 | 职责 | 运行时写入 |
|---|---|---|
| `src/` | 前端组件 + 服务层（agent-b-v2 技能包/check-agent/共享 lib） | 否 |
| `server/` | 11 个 Route Handler 的业务实现（Node 风格，经 compat 层接入） | 否 |
| `public/row-player.html` | 板书播放器单文件（自包含，不走构建；三胞胎机制守护） | 否 |
| `public/audio-cache/` | TTS 合成缓存（md5 命名，跨项目复用） | 是 |
| `public/pic/` | 题目截图 | 是 |
| `var/handoff/` `var/deliverable/` | 交接档与交付物实体（current.json 指针 + 时间戳档） | 是 |
| `upload/` `download/` | 交付归档 | — |
| `doc/` `skills/` | 文档与平台技能库（不参与构建） | 否 |

> `server/productionServer.js` 为 Vue+Vite 时代独立生产进程遗留（现零运行时引用），Next 部署**不使用**，仅作历史存档。

## 七、验收口径（收工六步之"测试通过/验证无误"）

1. **健康检查**：`curl -s :3000/api/health` → `{"ok":true,"status":"healthy","service":"qinghuabu-nextjs-dev",...}`
2. **TTS 配置**：`curl -s :3000/api/tts/info` → `keyCount` 与部署密钥数一致
3. **黄金路径**（浏览器）：输入题目 → 识别落位 → 生成执行表 → 一键语音 → 生成交付单页 → 下载标准交付包
4. **成品包验收**：解压 → 核对 manifest.json md5 → 双击 `board/*.html` 离线播放（音频在）
5. **程序包验收**：`md5sum -c manifest.md5` → `node standalone/server.js` → 回归 1-3

## 八、运维 FAQ

- **TTS 报限流/并发**：免费档有并发限制；多枚 key 自动轮询，批量合成已按 3 并发波次推进，勿调高。
- **交付物被清了**：`/api/cleanup` 按档引用保活清理 audio-cache/pic/board-result；误清后重走交付链路即恢复（export 对缺失资源如实披露进 manifest.missing）。
- **板书字体不对**：字体 CDN（fontsapi.zeoseven.com）需外网可达；离线自动回退系统手写字体，不影响播放。
- **改了播放器**：`public/row-player.html` 是唯一真身，改后交付物模板随 renderDeliverableHtml 生效；var/deliverable 内嵌副本不回写。
- **沙箱网关**：本仓开发环境经 Caddy 网关（XTransformPort 查询参数机制），生产部署无此层。

---
*本文件随交付链路变更同步更新；变更记录见 ENGINEERING_LOG.md，决策依据见 DECISIONS.md。*
