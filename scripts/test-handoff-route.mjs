import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

// ★ KI-034 回归（2026-10-30）：/handoff/:name 曾实测任意文件读取
// （GET /handoff/..%2F..%2F..%2F..%2F.env 拖出密钥全文），修复后必须有测试盯防。
const root = fileURLToPath(new URL('../', import.meta.url))
const source = fs.readFileSync(new URL('../src/app/handoff/[name]/route.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
const reads = []
const HANDOFF_DIR = path.resolve(root, 'var', 'handoff')
const scope = vm.createContext({
  module, exports: module.exports, Response,
  process: { cwd: () => root },
  require(name) {
    if (name === '@server/handoffStoreHandler.js') {
      return {
        HANDOFF_BASE_DIR: HANDOFF_DIR,
        fullPath: name => path.resolve(HANDOFF_DIR, name),
        readCurrentHandoff: () => ({ projectCode: 'test-001', handoff: { fake: 'current-handoff' } }),
      }
    }
    if (name === 'fs') {
      return {
        ...fs,
        existsSync(file, ...args) { reads.push(String(file)); return fs.existsSync(file, ...args) },
        readFileSync(file, ...args) { reads.push(String(file)); return fs.readFileSync(file, ...args) },
      }
    }
    throw new Error(`Unexpected dependency ${name}`)
  },
})
vm.runInContext(compiled, scope)
const get = rawName => module.exports.GET(new Request('http://localhost/handoff/' + rawName), { params: Promise.resolve({ name: rawName }) })

// 1) current.json 特例：返回指针解析后的全量 handoff
const cur = await get('current.json')
assert.equal(cur.status, 200, 'current.json special case must resolve')
assert.match(await cur.text(), /fake/, 'current.json returns resolved handoff payload')

// 2) 真实存在的档文件正常服务（拿仓里真实档名，不硬编码文件名）
const realFile = fs.readdirSync(HANDOFF_DIR).find(f => /^handoff-.*\.json$/.test(f))
if (realFile) {
  const hit = await get(realFile)
  assert.equal(hit.status, 200, `existing handoff file must resolve: ${realFile}`)
}

// 3) 攻击链：穿越/编码/控制字符全部 404，且不触任何盘读
for (const attack of [
  '..%2F..%2F..%2F..%2F.env',           // KI-034 原始向量（曾拖出 .env 密钥）
  '..%2F..%2F..%2F..%2Fserver%2Fhttp.js',
  '..',                                 // 裸 .. 段
  '%2e%2e%2f%2e%2e%2f.env',            // 全编码 ../
  'a%2F..',                            // 段内含斜杠
  '%00',                               // 控制字符
  '.',                                 // 当前目录段
]) {
  const before = reads.length
  const response = await get(attack)
  assert.equal(response.status, 404, `Traversal attack must be rejected: ${attack}`)
  assert.equal(reads.length, before, `Attack must not touch the disk: ${attack}`)
}

// 4) 不存在的档：404（允许 existsSync 探测，但不回读文件内容）
const beforeMissing = reads.length
const missing = await get('handoff-not-exist-9999.json')
assert.equal(missing.status, 404, 'missing handoff must 404')
assert.ok(reads.length - beforeMissing <= 1, 'missing file may probe existence only')

console.log('PASS handoff route: current.json special case, real file serving, and KI-034 traversal regression (all attacks 404 with zero disk reads)')
