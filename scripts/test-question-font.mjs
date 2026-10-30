import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { QUESTION_FONT_SIZE, QUESTION_FONT_FAMILY, BOARD_FONT_SIZE, CANVAS_SIZE, buildCanvasParams, HANDWRITING_FONT_CHOICES } from '../src/services/stepHandoff.js'
import { BOARD_LAYOUT, planLabelsFromTopic } from '../src/utils/boardLayout.js'
import { naturalLhWithFractionMargin } from '../src/lib/naturalLineHeight.js'

const root = fileURLToPath(new URL('../', import.meta.url))
function sourceFunction(path, name) {
  const text = fs.readFileSync(root + path, 'utf8')
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let found
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert(found, name + ' missing')
  return ts.transpile(found, { target: ts.ScriptTarget.ES2022 })
}
const computeLayout = sourceFunction('src/components/teaching/Step1Entry.tsx', 'computeTopicLayout')
const savedBlocks = sourceFunction('src/components/teaching/Step1Entry.tsx', 'savedBlocksMatchCurrentText')
const getBlockStyle = sourceFunction('src/components/teaching/BoardContentLayer.tsx', 'getBlockStyle')
for (const fontSize of [12, 28, 40, 96]) {
  for (const image of [null, { x: 6, y: 13, w: 38, maxH: 30 }]) {
    for (const isLandscape of [false, true]) {
      const input = { question: { ...BOARD_LAYOUT.question, fontSize }, image }
      const plan = planLabelsFromTopic(input, { isLandscape })
      assert.equal(plan.question.fontSize, QUESTION_FONT_SIZE, 'layout must ignore stale question font size')
      assert.equal(input.question.fontSize, fontSize, 'must not mutate saved layout')
    }
  }
  for (const seed of [0, 1, 2]) {
    for (const hasImage of [false, true]) {
      const scope = {
        QUESTION_FONT_SIZE,
        layoutSeedRef: { current: seed },
        sourceImageUrlRef: { current: hasImage ? '/fixture.png' : '' },
        keepOriginalRef: { current: hasImage },
        isLandscapeRef: { current: false },
        problemTextRef: { current: 'test question' },
        customTopicLayoutRef: { current: { question: { fontSize }, blocks: [{ id: 'legacy', text: 'test question', fontSize }] } },
        baseLayout: { ...BOARD_LAYOUT, image: { x: 6, y: 13, w: 38 } },
      }
      const result = vm.runInNewContext(savedBlocks + computeLayout + '\ncomputeTopicLayout()', scope)
      assert.equal(result.question.fontSize, QUESTION_FONT_SIZE, 'regeneration and saved layout must keep 30px')
      assert.equal(result.blocks[0].fontSize, QUESTION_FONT_SIZE, 'saved question block metadata must keep 30px')
    }
  }
  const style = vm.runInNewContext(getBlockStyle + '\ngetBlockStyle(block)', {
    QUESTION_FONT_SIZE, QUESTION_FONT_FAMILY, CANVAS_SIZE,
    BOARD_TEXT_COLOR: '#000000', realQuestionFontSize: QUESTION_FONT_SIZE,
    realCanvasWidth: CANVAS_SIZE.width, topicLhRatio: 1.2,
    localBlockCoords: new Map(), localBlockWidths: new Map(),
    naturalLhWithFractionMargin,
    block: { id: 'test', x: 6, y: 13, w: 40, fontSize },
  })
  assert.equal(style.fontFamily, QUESTION_FONT_FAMILY)
  assert.equal(style.fontSize, `calc(${QUESTION_FONT_SIZE} * 1cqw / ${CANVAS_SIZE.width / 100})`, 'block override must not change question font')
}
assert.equal(QUESTION_FONT_SIZE, 30)
assert.equal(QUESTION_FONT_FAMILY, '"Microsoft YaHei"')
for (const choice of HANDWRITING_FONT_CHOICES) {
  const params = buildCanvasParams(choice.id)
  assert.equal(params.fontSize.question.px, 30)
  assert.equal(params.fontSource.question.stack, QUESTION_FONT_FAMILY)
  for (const zone of ['analysis', 'solution', 'summary']) assert.equal(params.fontSize[zone].px, BOARD_FONT_SIZE)
  assert.notEqual(params.fontSource.handwriting.fontStack, params.fontSource.question.stack)
}

const { buildStandardExplainParamsSection } = await import('../src/lib/speechMarkdown.js')
const writes = new Map()
const realFs = { ...fs }
mock.module('fs', () => ({ ...realFs, writeFileSync: (path, data) => writes.set(String(path), data), mkdirSync: () => { throw Error('Unexpected disk mutation') } }))
const { writeDeliverableFile } = await import('../server/deliverableStoreHandler.js')
for (const choice of HANDWRITING_FONT_CHOICES) {
  const canvasParams = buildCanvasParams(choice.id)
  canvasParams.fontSize.question.px = 99
  canvasParams.fontSize.question.family = 'wrong handwriting font'
  canvasParams.fontSize.analysis.px = 44
  const markdown = buildStandardExplainParamsSection({ canvasParams, handwritingFontChoice: choice.id }).join('\n')
  assert(markdown.includes('| 题目区字号 | 30px |'))
  assert(markdown.includes('"Microsoft YaHei"'))
  assert(markdown.includes('| 分析区字号 | 44px |'), 'board zone configuration must remain independent')
  writes.clear()
  const result = writeDeliverableFile({ projectCode: 'question-font-regression', problemText: 'test question', canvasParams,
    uiSettings: { questionFontSize: '99px', questionFontFamily: 'wrong handwriting font', handwritingFontChoice: choice.id }, rows: [] })
  assert.equal(result.deliverable.uiSettings.questionFontSize, '30px')
  assert.equal(result.deliverable.uiSettings.questionFontFamily, QUESTION_FONT_FAMILY)
  assert.equal(result.deliverable.canvasParams.fontSize.question.px, 30)
  assert.equal(writes.size, 4)
}
console.log('PASS: fixed question font across layout variants, regeneration, saved overrides, block styles, handwriting choices and export metadata; disk writes=0')
