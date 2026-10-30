import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { mock } from 'bun:test'
import { getAgentBoardToolCatalog, validateBoardToolAction } from '../src/board-tools/boardToolCatalog.js'
import { normalizeAgentBV2ActionSpec, normalizeBoard } from '../src/agent-b-v2/contract.js'
import { checkSkillViolations } from '../src/check-agent/skillViolations.js'
import { AGENT_B_V2_SYSTEM_PROMPT } from '../src/agent-b-v2/prompt.js'

const notation = action => ({ tool: 'rough-notation', action, target: { region: 'analysis', exactText: '关键词' }, order: 1 })
const removed = { tool: 'rough-line', region: 'analysis', start: [20, 52], end: [50, 52], order: 2 }
const allowed = ['underline', 'circle']
assert.deepEqual(getAgentBoardToolCatalog().tools.map(t => t.id), ['rough-notation'])
assert.deepEqual(getAgentBoardToolCatalog().tools[0].actions.map(a => a.action), allowed)
for (const action of allowed) {
  assert.equal(validateBoardToolAction(notation(action)).ok, true)
  assert.equal(checkSkillViolations({ actionSpec: [{ action: notation(action) }] }).length, 0)
}
for (const action of [removed, { tool: 'draw' }, notation('highlight'), notation('rough-arrow'), notation(undefined)]) {
  assert.equal(validateBoardToolAction(action).ok, false)
  assert.deepEqual(normalizeAgentBV2ActionSpec([{ action }]), [])
  assert.ok(checkSkillViolations({ actionSpec: [{ action }] }).length > 0)
}
const entries = [{ action: notation('underline') }, { action: removed }, { action: notation('circle') }]
assert.equal(normalizeAgentBV2ActionSpec(entries).length, 2)
assert.ok(normalizeBoard({ content: '------' }).content.includes('------'), 'Mathematical rule lines must survive')
const example = AGENT_B_V2_SYSTEM_PROMPT.split('### 完整 JSON 样例')[1].match(/```json([\s\S]*?)```/)[1]
for (const row of JSON.parse(example).rows) for (const entry of row.actionSpec) assert.equal(validateBoardToolAction(entry.action).ok, true)

const html = fs.readFileSync(new URL('../public/row-player.html', import.meta.url), 'utf8')
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).join('\n')
new vm.Script(script)
const source = ts.createSourceFile('row-player.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const playerPredicate = source.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'isSupportedAction')
assert.ok(playerPredicate)
const playerContext = vm.createContext({})
vm.runInContext(playerPredicate.getText(source), playerContext)
for (const action of [notation('underline'), notation('circle'), removed, notation('highlight'), notation(undefined), null]) {
  assert.equal(playerContext.isSupportedAction(action), validateBoardToolAction(action).ok)
  assert.equal(playerContext.isSupportedAction({ action }), validateBoardToolAction(action).ok)
}

const anchorCode = fs.readFileSync(new URL('../src/board-tools/boardAnchorCore.js', import.meta.url), 'utf8')
const anchorSource = ts.createSourceFile('boardAnchorCore.js', anchorCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
for (const name of ['findRange', 'sameBoardLine']) {
  const playerFunction = source.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name).getText(source)
  const anchorFunction = anchorSource.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name).getText(anchorSource)
  assert.equal(playerFunction.replaceAll('\r\n', '\n'), anchorFunction.replaceAll('\r\n', '\n'))
  vm.runInContext(playerFunction, playerContext)
}
assert.equal(playerContext.findRange([], '', 1, { allowWrap: true }), null)
assert.equal(playerContext.findRange([{ ch: '字', x: 0, y: 30, w: 20 }], '', 1), null)

// Compile the real player timeline without drawing or browser storage.
for (const name of ['actionDurationMs', 'compile']) {
  vm.runInContext(source.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name).getText(source), playerContext)
}
Object.assign(playerContext, { resolveTagAnchor: () => null, HAND_LIFT_MS: 1000 })
const playerRow = { stage: '题目', speech: '关键词', board: { content: '' } }
const compilePlayer = actionSpec => playerContext.compile({ rows: [{ ...playerRow, actionSpec }] }).rows[0]
assert.equal(compilePlayer(entries).plan.filter(p => p.type === 'action').length, 2)
assert.equal(compilePlayer([{ action: removed }]).durMs, compilePlayer([]).durMs)

for (const file of ['skill-3.html', 'skill-4.html', 'skill-6.html', 'integration-guide.html', 'index.html']) {
  const page = fs.readFileSync(new URL(`../public/skills-hub/${file}`, import.meta.url), 'utf8')
  for (const match of page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1], { filename: file })
}

// Capture every export write in memory; never touch current or historical user deliverables.
const realFs = { ...fs }
const writes = new Map()
mock.module('fs', () => ({ ...realFs, writeFileSync: (path, data) => writes.set(String(path), data), mkdirSync: () => { throw Error('Unexpected disk mutation') } }))
const { writeDeliverableFile } = await import('../server/deliverableStoreHandler.js')
const stale = [{ type: 'action', action: { action: removed }, startOffsetMs: 0, durationMs: 99999 }]
const result = writeDeliverableFile({
  projectCode: 'offline-action-check', problemText: '验证动作白名单',
  rows: [{ stage: '分析', speech: '标记关键词。', board: { content: '关键词', startDelay: 0 },
    actionSpec: entries, plan: stale, exclusiveExecutionPlan: stale, estimatedDurationMs: 99999, totalDurationMs: 99999 }],
})
const row = result.deliverable.rows[0]
assert.equal(writes.size, 4)
assert.deepEqual(row.actionSpec.map(e => e.action.action), allowed)
for (const plan of [row.plan, row.exclusiveExecutionPlan]) {
  const actions = plan.filter(e => e.type === 'action')
  assert.equal(actions.length, 2)
  for (const entry of actions) assert.equal(validateBoardToolAction(entry.action.action).ok, true)
}
assert.notEqual(row.totalDurationMs, 99999)
console.log('action whitelist checks passed: catalog, Check Agent, contract, prompt JSON, player parity, export plans; disk writes=0')
