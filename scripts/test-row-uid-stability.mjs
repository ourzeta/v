import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as timing from '../src/agent-b-v2/timing.js'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const row = (speech, extra = {}) => ({ stage: '分析', speech, board: { content: '1' }, actionSpec: [], ...extra })
const restored = timing.applyAgentBV2Timeline([row('原行', { _rowUid: 'row-uid-1' })])
const inserted = timing.applyAgentBV2Timeline([...restored, row('新增行'), row('重复旧ID', { _rowUid: 'row-uid-1' })])
assert.equal(inserted[0]._rowUid, 'row-uid-1')
assert.equal(new Set(inserted.map(r => r._rowUid)).size, 3)
const edited = timing.applyAgentBV2Timeline(inserted.map(r => ({ ...r, speech: `${r.speech}改` })).reverse())
assert.deepEqual(edited.map(r => r._rowUid), inserted.map(r => r._rowUid).reverse())
assert.deepEqual(timing.ensureAgentBRowIds(JSON.parse(JSON.stringify(edited))), edited)

// Exercise the real fallback with an absent crypto API and frozen clock, including future legacy IDs.
const timingSource = readFileSync(new URL('../src/agent-b-v2/timing.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const uidCode = timingSource.slice(timingSource.indexOf('let rowUidSequence ='), timingSource.indexOf('/**\n * 对 rows', timingSource.indexOf('let rowUidSequence ='))).replace('export function', 'function')
const fallback = vm.createContext({ Date: { now: () => 0 }, crypto: undefined })
vm.runInContext(uidCode, fallback)
const fallbackRows = vm.runInContext(`ensureAgentBRowIds([{_rowUid:'row-0-1'}, {}, {_rowUid:'row-0-1'}, {_rowUid:'row-0-2'}])`, fallback)
assert.equal(new Set(fallbackRows.map(r => r._rowUid)).size, 4)
assert.equal(fallbackRows[0]._rowUid, 'row-0-1')
assert.equal(fallbackRows[3]._rowUid, 'row-0-2')

// Extract actual component functions; no React mount, credentials, disk writes or network requests.
const source = readFileSync(new URL('../src/components/teaching/AgentBDirect.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('AgentBDirect.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
assert.equal(ast.parseDiagnostics.length, 0)
const functions = new Map()
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(ast))
  ts.forEachChild(node, visit)
}
visit(ast)
const ref = current => ({ current })
const context = {
  ...timing, rowsRef: ref([]), canvasParamsRef: ref({ rowGapMs: 1000 }),
  generatedModelRef: ref('test'), playingAudioIndexRef: ref(null), activeAudioRef: ref(null),
  batchAudioStateRef: ref({ running: false }), pendingCheckRowsRef: ref(null),
  checkChangesRef: ref([]), checkSourceRef: ref('check_agent'),
  message: { info() {}, success() {}, warning() {} },
  setTimeout: callback => callback(), window: {}, console,
  cacheWrites: [], outgoingChecks: [],
}
context.setRowsState = rows => { context.rowsRef.current = rows }
context.bCacheSet = rows => context.cacheWrites.push(rows)
context.setPlayingAudioIndex = index => { context.playingAudioIndexRef.current = index }
context.setBatchAudioState = state => { context.batchAudioStateRef.current = state }
context.applyCheckResult = rows => { context.outgoingChecks.push(rows); return Promise.resolve() }
context.setPendingCheckRows = rows => { context.pendingCheckRowsRef.current = rows }
for (const name of ['setCheckChanges', 'setCheckState', 'setCheckResultOpen', 'setCheckFailedFallback']) context[name] = () => {}
vm.createContext(context)
for (const name of ['rowsWithoutInternalIds', 'setRows', 'findAudioRowIndex', 'setRowAudioUrl', 'recordAudioMetadata', 'stopCurrentAudio', 'playAudioUrl', 'handleBatchGenerateAudio', 'applyCheckChanges']) {
  vm.runInContext(ts.transpileModule(functions.get(name), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context)
}
context.readAudioDuration = async () => 900
const original = timing.applyAgentBV2Timeline([row('甲', { audioUrl: '/a.wav', audioDurationMs: 800 }), row('乙', { audioUrl: '/b.wav', audioDurationMs: 700 })])
context.rowsRef.current = []
context.setRows(original)
const ids = original.map(r => r._rowUid)
context.setRows(context.rowsRef.current.map((r, index) => index ? r : { ...r, speech: '甲改' }))
assert.equal(context.rowsRef.current[0]._rowUid, ids[0])
assert.equal(context.rowsRef.current[0].audioUrl, undefined)
assert.equal(context.rowsRef.current[0].audioDurationMs, undefined)
assert.equal(context.rowsRef.current[0].timingStatus, 'estimated')
assert.equal(context.rowsRef.current[1].audioUrl, '/b.wav')
context.pendingCheckRowsRef.current = context.rowsRef.current.map((r, index) => ({ stage: r.stage, speech: index ? '乙改' : r.speech, board: r.board, actionSpec: [] }))
context.checkChangesRef.current = [{}]
context.applyCheckChanges()
assert.deepEqual(Array.from(context.rowsRef.current, r => r._rowUid), ids)
assert.equal(context.rowsRef.current[1].audioUrl, undefined)
assert.ok(context.outgoingChecks[0].every(r => !('_rowUid' in r) && !('_rowKey' in r)))
assert.match(source, /rows: rowsWithoutInternalIds\(rowsRef.current\)/)

// Keep unchanged speech audio when Check changes only board content.
context.rowsRef.current = []
context.setRows(original)
context.pendingCheckRowsRef.current = original.map(r => ({ ...r, board: { content: '新板书' } }))
context.checkChangesRef.current = [{}]
context.applyCheckChanges()
assert.equal(context.rowsRef.current[0].audioUrl, '/a.wav')
assert.equal(context.rowsRef.current[1].audioUrl, '/b.wav')

// Pending metadata follows identity across reorder and cannot revive audio after an edit.
let finishMetadata
context.readAudioDuration = () => new Promise(resolve => { finishMetadata = resolve })
const metadata = context.recordAudioMetadata(ids[0], '甲', '/a.wav')
context.setRows(context.rowsRef.current.slice().reverse())
finishMetadata(1234)
await metadata
assert.equal(context.rowsRef.current.find(r => r._rowUid === ids[0]).audioDurationMs, 1234)
const staleMetadata = context.recordAudioMetadata(ids[0], '甲', '/a.wav')
context.setRows(context.rowsRef.current.map(r => r._rowUid === ids[0] ? { ...r, speech: '再改' } : r))
finishMetadata(9999)
assert.equal(await staleMetadata, -1)
assert.equal(context.rowsRef.current.find(r => r._rowUid === ids[0]).audioDurationMs, undefined)

// Real batch worker, controlled responses: reorder is safe; edited/deleted rows reject stale TTS.
context.readAudioDuration = async () => 900
for (const operation of ['reorder', 'edit', 'delete']) {
  context.setRows(timing.applyAgentBV2Timeline([row('待生成'), row('已有', { audioUrl: '/existing.wav' })]))
  const target = context.rowsRef.current[0]
  let finishRequest
  context.fetch = () => new Promise(resolve => { finishRequest = resolve })
  const pending = context.handleBatchGenerateAudio()
  if (operation === 'reorder') context.setRows(context.rowsRef.current.slice().reverse())
  if (operation === 'edit') context.setRows(context.rowsRef.current.map(r => r._rowUid === target._rowUid ? { ...r, speech: '新口播' } : r))
  if (operation === 'delete') context.setRows(context.rowsRef.current.slice(1))
  finishRequest({ ok: true, json: async () => ({ ok: true, audioUrl: '/generated.wav' }) })
  await pending
  const current = context.rowsRef.current.find(r => r._rowUid === target._rowUid)
  if (operation === 'reorder') assert.equal(current.audioUrl, '/generated.wav')
  else assert.ok(!current?.audioUrl)
  assert.equal(context.rowsRef.current.find(r => r.speech === '已有').audioUrl, '/existing.wav')
}

// Menu always restarts; main button retains toggle-to-stop semantics.
let plays = 0
class FakeAudio {
  constructor() { this.listeners = new Map(); this.currentTime = 0 }
  addEventListener(type, listener) { this.listeners.set(type, listener) }
  removeEventListener(type) { this.listeners.delete(type) }
  load() { this.listeners.get('canplaythrough')?.() }
  pause() {}
  async play() { plays++ }
}
context.window.Audio = FakeAudio
context.rowsRef.current = []
context.setRows(original)
await context.playAudioUrl('/a.wav', 0)
assert.equal(plays, 1)
await context.playAudioUrl('/a.wav', 0)
assert.equal(context.activeAudioRef.current, null)
await context.playAudioUrl('/a.wav', 0)
await context.playAudioUrl('/a.wav', 0, { alwaysRestart: true })
assert.equal(plays, 3)
const modal = readFileSync(new URL('../src/components/teaching/agentb/CheckResultModal.tsx', import.meta.url), 'utf8')
const modalAst = ts.createSourceFile('CheckResultModal.tsx', modal, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
assert.equal(modalAst.parseDiagnostics.length, 0)
assert.match(modal, /__key: index/)
assert.match(source, /playAudioUrl\(record.audioUrl, index, \{ alwaysRestart: true \}\)/)
console.log('PASS: UID restore/duplicate/edit/reorder/fallback; Check identity/audio/transport; TTS edit/delete/reorder/metadata races; audio menu/toggle; TSX syntax')
