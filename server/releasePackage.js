/* 商业交付包（release package）组装器 — 面向最终客户的单题成品 ZIP
 *
 * 设计约束（2026-10-26 商业交付标准化轮立约）：
 *   1. 零改动渲染端：zip 内目录结构必须复用 normalizeDeliverableAssetPaths 既有
 *      相对路径契约（HTML 内引用 ../audio-cache/x.mp3、../pic/x.jpg），播放器/
 *      渲染器一行不动，http 与 file:// 双击双协议均可命中包内资源。
 *   2. 纯组装器：读档/读档时机由调用方（deliverableStoreHandler export 分支）注入，
 *      本模块不 import store handler，杜绝循环依赖。
 *   3. 如实披露：资源缺失（音频未生成/文件丢失）不炸包，记入 manifest.missing。
 *
 * ZIP 结构（复用 #017 相对契约，board/ 子目录与 audio-cache/ 同级）：
 *   deliverable-{projectCode}/
 *     board/deliverable-{projectCode}.html   交付页（内嵌播放器+数据，单文件自包含）
 *     board/fonts/                          板书手写字体（与 html 同级，离线必需）
 *     audio-cache/*.mp3                      行口播音频（有则入包）
 *     pic/shot-*.jpg                         题目图（有则入包）
 *     data/deliverable-{projectCode}.json    工程规格 JSON（对接/二次开发用）
 *     manifest.json                          交付清单（文件字节数+md5，验收口径）
 *     README.txt                             客户使用说明（UTF-8 带 BOM，老记事本防乱码）
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import JSZip from 'jszip'
import { normalizeDeliverableAssetPaths } from '../src/lib/deliverableAssetPaths.js'

const PUBLIC_DIR = resolve(process.cwd(), 'public')

// 生成器署名（读 package.json 单源，不硬编码版本）
function readGeneratorSignature() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
    return `${pkg.name || 'qinghuabu-teaching-workbench'}/${pkg.version || '0.0.0'}`
  } catch {
    return 'qinghuabu-teaching-workbench/unknown'
  }
}

function md5(buf) {
  return createHash('md5').update(buf).digest('hex')
}

export const RELEASE_PACKAGE_FORMAT = 'qinghuabu-release-package'
export const RELEASE_PACKAGE_FORMAT_VERSION = 1

/** 相对资源引用（../audio-cache/x.mp3）→ 磁盘实体路径（public/audio-cache/x.mp3）
 *  ★ 只剥 '../' 三字符前缀：slice(2) 会残留前导斜杠，resolve 对绝对路径段会
 *    直接解析到磁盘根，把存在的文件误报为缺失（2026-10-26 实测踩坑） */
function resolvePackAsset(relRef) {
  if (typeof relRef !== 'string' || !relRef.startsWith('../')) return null
  const clean = relRef.replace(/^\.\.\//, '') // ../audio-cache/x.mp3 → audio-cache/x.mp3
  if (clean.includes('..')) return null // 防目录穿越，仅接受单级回退契约
  return resolve(PUBLIC_DIR, clean)
}

/** zip 内子路径 → public/ 磁盘路径 同构映射（audio-cache/x.mp3 ↔ public/audio-cache/x.mp3） */
function publicAssetZipPath(diskPath) {
  return diskPath.slice(PUBLIC_DIR.length + 1).split('\\').join('/')
}

function buildReadme({ projectCode, createdAt, problemText, rowsCount, mp4Guide }) {
  const lines = [
    '【讲题微课交付包】使用说明',
    '',
    `交付编号：${projectCode}`,
    `题目：${problemText}`,
    `内容：${rowsCount} 步板书微课（含口播音频）`,
    `打包时间：${createdAt}`,
    '',
    '一、怎么打开',
    '  双击 board/ 目录里的 HTML 文件，用浏览器打开（推荐 Chrome / Edge），微课即可播放。',
    '  播放页左上有「播放/暂停」，右上有「录制」按钮。',
    '',
    '二、目录约定（请勿拆散）',
    '  board/        微课页面（双击打开的入口；fonts/ 是板书手写字体，拆散板书会变印刷体）',
    '  audio-cache/  口播音频（页面自动引用，必须与 board/ 保持现在的相对位置）',
    '  pic/          题目图（同上，保持相对位置）',
    '  data/         工程规格 JSON（对接/二次开发用，日常使用无需关心）',
    '  manifest.json 交付清单（每个文件的字节数与 md5 校验值，可用于验收）',
    '',
    '三、需要 MP4 视频文件怎么办',
    '  页面内点「录制」按钮 → 播放一遍 → 自动下载 .webm 录像，再二选一转成 MP4：',
    '  方法A（零门槛）：把 webm 拖进剪映（CapCut）→ 直接导出 MP4。',
    `  方法B（命令行）：${mp4Guide}`,
    '  （板书字体 CDN 需联网；离线打开时会回退为系统手写字体，不影响播放。）',
    '',
    '四、验收',
    '  打开 manifest.json 核对 files 列表的 md5 值即可确认交付包完整性。',
    '',
    '由「青花布讲题视频工作台」生成',
  ]
  // UTF-8 BOM：老版 Windows 记事本无 BOM 会按 ANSI 解码导致中文乱码
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}

/**
 * 组装交付包文件集合（纯数据，不含 zip；供测试直测与 handler 消费）。
 * @param {object} input
 * @param {object} input.deliverable 交付物 JSON（盘上档，出口①已归一；此处幂等再归一）
 * @param {string} input.projectCode 项目编码
 * @param {string} input.htmlContent 交付页 HTML 文本（调用方优先读盘上 companion，缺则现场渲染）
 * @returns {{ files: Array<{path:string, data:Buffer|string}>, manifest: object }}
 */
export function buildReleasePackageFiles({ deliverable, projectCode, htmlContent }) {
  // 幂等归一副本：不改调用方传入的档对象（normalize 为原地写）
  const normalized = normalizeDeliverableAssetPaths(structuredClone(deliverable || {}))
  const rows = Array.isArray(normalized.rows) ? normalized.rows : []
  const problemText = String(normalized.problemText || '').replace(/\s+/g, ' ').trim()
  const createdAt = normalized.createdAt || normalized.meta?.generatedAt || new Date().toISOString()

  const files = []
  const missing = []
  const external = []
  const seenZipPaths = new Set()
  const seenMissing = new Set()
  const rootDir = `deliverable-${projectCode}`

  function pushFile(zipPath, data) {
    if (seenZipPaths.has(zipPath)) return
    seenZipPaths.add(zipPath)
    files.push({ path: zipPath, data })
  }

  function collectAsset(relRef, kind) {
    if (typeof relRef !== 'string' || relRef === '') return
    const disk = resolvePackAsset(relRef)
    if (!disk) {
      // http(s)/data:/blob: 等外部资源：不入包（下载第三方资源越权），manifest 如实披露
      if (/^(https?:|data:|blob:)/.test(relRef)) {
        external.push({ ref: relRef, kind })
      }
      return
    }
    if (!existsSync(disk)) {
      // 同一资源可能被多落点引用（顶层/problemInfo），按 ref 去重披露
      const key = `${kind}|${relRef}`
      if (!seenMissing.has(key)) {
        seenMissing.add(key)
        missing.push({ ref: relRef, kind, reason: '引用的资源文件不存在（未生成或已被清理）' })
      }
      return
    }
    // ★ 资源收进交付包根目录（board/ 的同级）——HTML 内引用 ../audio-cache/、../pic/
    //   才能在解包后 file:// 双击时命中包内文件（离线契约的落位前提）
    pushFile(`${rootDir}/${publicAssetZipPath(disk)}`, readFileSync(disk))
  }

  // 1) 交付页 HTML（board/ 子目录 = 相对契约的落位前提，资源在其同级）
  pushFile(`${rootDir}/board/deliverable-${projectCode}.html`, htmlContent)

  // 2) 行音频（rows / sequence 双形状同规，与 #017 四出口口径一致）
  const rowList = Array.isArray(normalized.rows)
    ? normalized.rows
    : (Array.isArray(normalized.sequence) ? normalized.sequence : [])
  let audioRows = 0
  for (const row of rowList) {
    if (!row || typeof row !== 'object') continue
    const ref = row.mp3 || row.audioUrl || ''
    if (typeof ref === 'string' && ref !== '' && row.mp3 !== '') audioRows += 1
    collectAsset(ref, 'row-audio')
  }

  // 3) 题目图（顶层 / topicSpec / problemInfo 三落点，同 #017）
  for (const holder of [normalized, normalized.topicSpec, normalized.problemInfo]) {
    if (holder && typeof holder === 'object' && typeof holder.screenshotUrl === 'string') {
      collectAsset(holder.screenshotUrl, 'problem-image')
    }
  }

  // 3.5) 板书字体本地源（★ 2026-10-26 落位修正：收进 board/fonts/——与 board/*.html 同级，
  //      模板相对引用 href="fonts/board-local.css" 在线上（/row-player.html → /fonts/）与
  //      ZIP（board/xxx.html → board/fonts/）双场景同构命中，零模板手术。
  //      实锤教训：首版收在包根 fonts/ 而html 在 board/ 子目录，相对解析成 board/fonts/ → 404，
  //      字体全落空 → 除号减号变电脑硬刷体。只收 css+ttf；LICENSE/宣传图不入包。
  //      缺字体时如实披露（板书将按字体栈降级）。
  const FONTS_DIR = resolve(PUBLIC_DIR, 'fonts')
  let fontFiles = 0
  if (existsSync(FONTS_DIR)) {
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const disk = resolve(dir, name)
        if (statSync(disk).isDirectory()) { walk(disk); continue }
        if (!/\.(css|ttf|woff2?|otf)$/i.test(name)) continue
        const rel = disk.slice(PUBLIC_DIR.length + 1).split('\\').join('/')   // fonts/lijian/… 相对 public/
        pushFile(`${rootDir}/board/${rel}`, readFileSync(disk))
        fontFiles += 1
      }
    }
    walk(FONTS_DIR)
  }
  if (fontFiles === 0) {
    missing.push({ ref: 'board/fonts/', kind: 'board-font', reason: '本地板书字体缺失（public/fonts/ 为空），板书将按字体栈降级' })
  }

  // 4) 工程规格 JSON（归一后落包，与播放页数据同源）
  pushFile(`${rootDir}/data/deliverable-${projectCode}.json`, JSON.stringify(normalized, null, 2))

  // 5) manifest（先落骨架，md5 待文件集定型后回填）与 README
  const totalDurationMs = rows.reduce((sum, r) => sum + (Number(r?.totalDurationMs) || Number(r?.estimatedDurationMs) || 0), 0)
  const manifest = {
    format: RELEASE_PACKAGE_FORMAT,
    formatVersion: RELEASE_PACKAGE_FORMAT_VERSION,
    projectCode,
    problemText: problemText.slice(0, 100),
    problemType: normalized.problemType || null,
    rows: rows.length,
    audioRows,
    totalDurationMs,
    createdAt,
    generator: readGeneratorSignature(),
    files: [], // 回填
    missing,
    external,
  }
  const mp4Guide = 'ffmpeg -i 录制.webm -c:v libx264 -c:a aac -movflags +faststart 讲题.mp4'
  pushFile(`${rootDir}/manifest.json`, JSON.stringify(manifest, null, 2))
  pushFile(
    `${rootDir}/README.txt`,
    buildReadme({ projectCode, createdAt, problemText: problemText.slice(0, 60) || '（见页面）', rowsCount: rows.length, mp4Guide }),
  )

  // 6) 回填 files 清单（md5/bytes 以 Buffer 口径计算）
  //    ★ manifest 不记录自身（自指不成立：写入清单会改变自身内容，md5 永远对不上）
  manifest.files = files
    .filter((f) => f.path !== `${rootDir}/manifest.json`)
    .map((f) => {
      const buf = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, 'utf-8')
      return { path: f.path, bytes: buf.length, md5: md5(buf) }
    })
  // manifest 自身以最终形态重写（保持文件集 path 唯一性，覆盖骨架版）
  const manifestIdx = files.findIndex((f) => f.path === `${rootDir}/manifest.json`)
  if (manifestIdx >= 0) {
    files[manifestIdx] = { path: `${rootDir}/manifest.json`, data: JSON.stringify(manifest, null, 2) }
  }

  return { files, manifest }
}

/**
 * 打包为 ZIP Buffer。
 * @param {Array<{path:string, data:Buffer|string}>} files
 * @returns {Promise<Buffer>}
 */
export async function zipReleasePackageFiles(files) {
  const zip = new JSZip()
  for (const f of files) {
    zip.file(f.path, f.data)
  }
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

/** 交付包下载文件名（中文外名 + ASCII 兜底段，Content-Disposition 双段式） */
export function releasePackageFilename(projectCode) {
  const ascii = `deliverable-${projectCode}.zip`
  const utf8 = encodeURIComponent(`讲题-${projectCode}.zip`)
  return { ascii, utf8, contentDisposition: `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}` }
}
