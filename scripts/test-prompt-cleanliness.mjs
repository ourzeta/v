import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { AGENT_B_V2_SYSTEM_PROMPT } from '../src/agent-b-v2/prompt.js'
import { liyongleElementary } from '../src/agent-b-v2/skills/liyongle-elementary/index.js'
import { CHECK_AGENT_SYSTEM_PROMPT } from '../src/check-agent/prompt.js'

const sampleHashes = {
  "src/agent-b-v2/prompt.js": [
    "5092155946276d885b000a7b59293925877d34b2cd75e5c601e4148b4a725254",
    "857354100da7f7d42ba7f237152110b68ff8a3d799e2dbbf28e861969682f5c3"
  ],
  "src/agent-b-v2/skills/liyongle-elementary/board-rules.js": [
    "1e58b7a0f2675adbe0abc206540921afeebe04a4835b9c982b20fb9a92f82c4b",
    "53f3ab29342fe4e81b960073476a0958ff5ba574e05c374bc39153a6b2e9e71f"
  ],
  "src/agent-b-v2/skills/liyongle-elementary/examples.js": [
    "26d816422acf8af7a16710a36035fb2fa841c12736adec3f81a8060380bf0084",
    "d4a8ac4ed839f9da4ba6e1db47dfd226d5c880745254cb4f7a831e9ee03c739f",
    "5aeb4b974b2a2f930d455cdc406e3fa7dd36e837ebc8982750d8650dd2c8a9be",
    "511d2da152526d2a93db87e990da49b979283f5859dfbfaa6d477770f6fe9ff2",
    "50e908f42e35e779428df4aeebb08f65a77ea5e774196dd71875dae53f070a44",
    "04cfb2a3132118f29dc6bde06620f1784bec1d0078e93ff6ba594e948af2235a"
  ]
}
const hash = value => createHash('sha256').update(value).digest('hex')

for (const [file, expected] of Object.entries(sampleHashes)) {
  const source = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const fence = String.fromCharCode(92, 96).repeat(3)
  const parts = source.split(fence)
  const blocks = parts.filter((_, index) => index % 2 === 1).map(block => hash(fence + block + fence))
  assert.deepEqual(blocks, expected, 'Preserve every original fenced example: ' + file)
}

const source = fs.readFileSync(new URL('../src/agent-b-v2/prompt.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const appendix = source.slice(source.indexOf('## 8. 附录'), source.lastIndexOf(String.fromCharCode(96)))
// ★ 2026-10-30 白名单化（原单值 pin 过期）：附录在 KI 系数学口播统一化（艾克斯→X，
// 见 KNOWN_ISSUES KI-025/KI-027 轨迹）中有意编辑，语义断言（下方 47-50 行）全数成立。
// 沿用本文件 fenced 样例的多版本哈希先例：保留历史哈希以便审计，新增当前版本。
const appendixHashes = [
  'f4c8a18f0d40ab1ad0b387b6a7e2835e0733264f7a7d0fe48ac2ed43dfeb1e54', // 2026-10-29 前版本
  '209a1977e6b1f9d6b64cda27dd234ee10fa132cb28d763952430b4d6e77f1fee', // 2026-10-30 数学口播统一化版本
  '3d4b348992de0eed128efb1b9b41dbb1c979bf9210a10dfb0080526ef538e69f', // 2026-10-30 提示词归一化（附录数字口播统一阿拉伯数字、补齐悬空引号；主文结构化不改附录语义）
]
assert.ok(appendixHashes.includes(hash(appendix)), 'Preserve complete original style appendix')

for (const prompt of [AGENT_B_V2_SYSTEM_PROMPT, liyongleElementary.buildSystemPrompt(), CHECK_AGENT_SYSTEM_PROMPT]) {
  assert.doesNotMatch(prompt, /Task\s*\d+|20\d{2}-\d{2}-\d{2}|夏夏拍板|量化加严/)
  assert.doesNotMatch(prompt, /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/)
  assert.doesNotMatch(prompt, /艾克斯/)
  assert.ok(prompt.includes('startDelay') && prompt.includes('underline') && prompt.includes('circle'))
  assert.ok(prompt.includes('30X·3=90X') && prompt.includes('frac{3+34}{5}'))
}
// Guard teaching constraints that example hashes cannot protect.
assert.ok(/读题不讲解法、不提前报答案/.test(AGENT_B_V2_SYSTEM_PROMPT), 'Reading must not explain the solution or reveal the answer');
assert.ok(/按朗读顺序.*1[—至-]3.*关键条件/.test(AGENT_B_V2_SYSTEM_PROMPT), 'Reading must mark 1-3 key conditions in spoken order');
assert.ok(/小数成品.*逐位.*3点一四/.test(liyongleElementary.buildSystemPrompt()), 'Decimal speech must read fractional digits individually');

// ★ 四条教学铁律（2026-10-30 归一）：生成侧两版提示词与 Check Agent 同口径
for (const prompt of [AGENT_B_V2_SYSTEM_PROMPT, liyongleElementary.buildSystemPrompt()]) {
  assert.ok(/不跳步/.test(prompt), 'Iron rule 1: 循序渐进不跳步')
  assert.ok(/一步一 row|一步一row/.test(prompt), 'Iron rule 2: 一步一 row')
  assert.ok(/关键公式写进分析区/.test(prompt), 'Iron rule 3: 关键公式写进分析区')
  assert.ok(/严禁故意讲错/.test(prompt), 'Iron rule 4: 严禁故意讲错（苏格拉底引导≠故意犯错误导）')
  assert.ok(!/简单题几步揉一行/.test(prompt), '反铁律清除：不再鼓励几步揉一行')
  assert.ok(!/附录 8\.6 第 2 条/.test(prompt), '过期引用清除：附录 8.6 第 2 条已不存在')
  assert.ok(!/小数可保留阿拉伯数字，也可将小数点写成/.test(prompt), '宽松小数读法副本已归一为逐位读法')
}
assert.ok(/不跳步/.test(CHECK_AGENT_SYSTEM_PROMPT) && /严禁故意讲错/.test(CHECK_AGENT_SYSTEM_PROMPT), 'Check Agent 与四条铁律同口径复核');

console.log('PASS prompts: original JSON examples and complete appendix preserved; runtime prompts contain no work-log tags or control characters')
