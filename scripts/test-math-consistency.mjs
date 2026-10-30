import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { normalizeBoardLine, boardTextToPlain, renderBoardSegmentHtml } from '../src/utils/superFilter.js'
import { formatMathSpeechToChinese } from '../src/lib/mathAsrConverter.js'

const html = fs.readFileSync(new URL('../public/row-player.html', import.meta.url), 'utf8')
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((a, b) => b.length - a.length)[0]
const ast = ts.createSourceFile('player.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const names = new Set(['UNICODE2SAFE', 'LATEX2SAFE', 'BOARD_SAFE_RE', 'repairCommonLatexEscapeDamage', 'decodeHtmlEntities', 'toHalfwidthVariants', 'normalizeBoardLine', 'subPlain'])
const declarations = []
for (const statement of ast.statements) {
  if (ts.isFunctionDeclaration(statement) && names.has(statement.name?.text)) {
    declarations.push(statement.getText(ast))
    names.delete(statement.name.text)
  }
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (names.has(declaration.name.getText(ast))) {
        declarations.push(`const ${declaration.getText(ast)};`)
        names.delete(declaration.name.getText(ast))
      }
    }
  }
}
assert.equal(names.size, 0, 'Extract production player functions and normalization tables')
const scope = vm.createContext({})
vm.runInContext(declarations.join('\n'), scope)
const inPlayer = (name, value) => vm.runInContext(`${name}(${JSON.stringify(value)})`, scope)

for (const [input, expected] of [
  ['30X · 3=90X', '30X·3=90X'],
  ['30X\\cdot3=90X', '30X·3=90X'],
  ['3/4x20', '\\frac{3}{4}x20'],
  ['7x2=14', '7x2=14'],
  ['12.-.3=4', '12.-.3=4'],
]) {
  assert.equal(normalizeBoardLine(input), expected, `Board: ${input}`)
  assert.equal(inPlayer('normalizeBoardLine', input), expected, `Player: ${input}`)
}
assert.equal(boardTextToPlain('\\frac{3+34}{5}'), '(3+34)/5')
assert.equal(inPlayer('subPlain', '\\frac{3+34}{5}'), '(3+34)/5')
assert.equal(boardTextToPlain('\\frac{3}{5+2}'), '3/(5+2)')
assert.match(renderBoardSegmentHtml('30X·3=90X'), /font-size:1\.57em/)
for (const [input, expected] of [
  ['3+34/5', '3加5分之34'],
  ['3/4x20', '4分之3乘以20'],
  ['7/15x20', '15分之7乘以20'],
  ['3x4/5', '3乘以5分之4'],
  ['\\frac{3+34}{5}', '5分之括号里3加34'],
  ['1/2+3/4', '2分之1加4分之3'],
  ['3.5/4', '4分之3点五'],
  ['2x/3', '3分之2X'],
  ['3x/4', '4分之3X'],
  ['2X/3', '3分之2X'],
  ['3.5x/4', '4分之3点五X'],
  ['2x/3x20', '3分之2X乘以20'],
]) assert.equal(formatMathSpeechToChinese(input), expected, `Speech: ${input}`)
console.log('PASS math consistency: multiplication, fraction meaning, speech and production-player parity')
