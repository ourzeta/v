import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = fs.readFileSync(new URL('../src/app/deliverable/[[...name]]/route.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const module = { exports: {} }
const reads = []
const scope = vm.createContext({
  module, exports: module.exports, Response, Uint8Array,
  process: { cwd: () => root },
  require(name) {
    // ★ KI-034（2026-10-30）：路由新增第二道防线消费 DELIVERABLE_BASE_DIR，桩同步供给
    if (name === '@server/deliverableStoreHandler.js') return { fullPath: name => path.resolve(root, 'var/deliverable', name), DELIVERABLE_BASE_DIR: path.resolve(root, 'var/deliverable') }
    if (name === 'fs') return { ...fs, readFileSync(file, ...args) { reads.push(file); return fs.readFileSync(file, ...args) } }
    if (name === 'path') return path
    throw new Error(`Unexpected dependency ${name}`)
  },
})
vm.runInContext(compiled, scope)
const get = name => module.exports.GET(new Request('http://localhost/deliverable/' + name.join('/')), { params: Promise.resolve({ name }) })
const css = await get(['fonts', 'board-local.css'])
assert.equal(css.status, 200, 'Deliverable relative font CSS must resolve')
assert.match(css.headers.get('content-type'), /text\/css/)
assert.match(await css.text(), /@font-face/)
for (const name of [
  ['fonts', '..', 'outside.css'],
  ['fonts', '..\\outside.css'],
  ['fonts', '%2e%2e%5coutside.css'],
  ['fonts', 'C:outside.css'],
  ['fonts', 'missing.woff2'],
  // ★ KI-034 回归（2026-10-30）：顶层穿越曾实测可拖全仓 json/md/.env
  ['..', 'package.json'],
  ['..', '..', 'KNOWN_ISSUES.md'],
  ['..%2F..%2Fpackage.json'],
  ['.'],
]) {
  const before = reads.length
  const response = await get(name)
  assert.equal(response.status, 404, `Reject or report missing resource: ${name.join('/')}`)
  if (!name.includes('missing.woff2')) assert.equal(reads.length, before, 'Invalid font paths must not read files')
}
console.log('PASS deliverable fonts: real CSS response, missing resource, traversal and Windows-path rejection')
