import assert from 'node:assert/strict'
import { mock } from 'bun:test'
let configured = false
mock.module('../src/lib/checkAgentApiConfig.js', () => ({ getCheckAgentApiSnapshot: () => configured
  ? { apiKey: 'test-only', model: 'test-only', endpoint: 'https://unused.invalid/chat/completions' }
  : {} }))
const { checkSkillViolations } = await import('../src/check-agent/skillViolations.js')
const { checkAgentRows } = await import('../src/check-agent/service.js')
const row = speech => ({ stage: '分析', speech, board: { content: '', startDelay: 0 }, actionSpec: [] })
for (const speech of ['我是不是可以先求总数呀？', '对不对呀？', '哎呀，咱们先看看题目。']) {
  assert.equal(checkSkillViolations(row(speech)).filter(v => v.from === '教风铁律').length, 0, speech)
}
assert.ok(checkSkillViolations(row('我算错了，咱们重来。')).some(v => v.from === '教风铁律'))
assert.equal(checkSkillViolations(row('2X加3等于11')).filter(v => v.from === 'speech-board-timing §五.2').length, 0)
assert.ok(checkSkillViolations(row('2x+3')).some(v => v.from === 'speech-board-timing §五.2'))
const crowded = { ...row('咱们先看清每个数量关系，再逐步计算。'.repeat(10)), board: { content: '1+1=2\n2+2=4\n4+4=8' } }
assert.ok(checkSkillViolations(crowded).some(v => v.msg.includes('挤行')))
const fast = await checkAgentRows({ rows: [row('我算错了，咱们重来。')], mode: 'asr_fast' })
assert.ok(fast.changes.some(v => v.field === 'skillViolation' && v.reason.includes('教风铁律')))
let requests = 0
globalThis.window = { setTimeout, clearTimeout }
globalThis.fetch = async () => { requests++; throw new Error('Simulated network failure') }
configured = true
const fallback = await checkAgentRows({ rows: [row('我算错了，咱们重来。')] })
assert.equal(requests, 1)
assert.ok(fallback.changes.some(v => v.field === 'skillViolation' && v.reason.includes('教风铁律')))
console.log('PASS Check teaching: normal questions, fumble warning, row granularity, fast and network-fallback audit')
