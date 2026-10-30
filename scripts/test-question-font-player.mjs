import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { currentTemplatePath, renderDeliverableHtml } from '../server/renderDeliverableHtml.js';

const playerPath = fileURLToPath(new URL('../public/row-player.html', import.meta.url));
const source = readFileSync(playerPath, 'utf8');
const expectedFont = '30px "Microsoft YaHei"';

function extract(html) {
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).find(text => text.includes('function render(t)'));
  assert.ok(script, 'Real player script exists');
  new vm.Script(script);
  const ast = ts.createSourceFile('player.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const functions = new Set(['compile', 'resolveTagAnchor', 'layoutText', 'naturalLhRatio',
    'render', 'drawStageTag', 'pick', 'normRow', 'normData', 'applyFontFromData', 'readLocalFontOverride',
    'applyHandFontChoice', 'syncFontSelUI', 'drawWriting', 'parseCoord', 'esc']);
  const constants = new Set(['QUESTION_FONT_SIZE', 'PRINT_FONT', 'HAND_FONT_STACKS',
    'HAND_FONT_FAMILY', 'HAND_FONT', 'FONT_CHOICE', 'FONT_VER', 'NATURAL_LH_EXTRA_PX',
    'TAG_LABEL_KEY', 'TAG_ZONE_KEY', 'TAG_FALLBACK', 'SAFE', 'STAGE_COLOR', 'BASE_CHAR_MS', 'HAND_LIFT_MS']);
  const parts = [];
  for (const statement of ast.statements) {
    if (ts.isFunctionDeclaration(statement) && functions.has(statement.name?.text)) {
      parts.push(statement.getText(ast));
      functions.delete(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!constants.has(declaration.name.getText(ast))) continue;
        const kind = statement.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let';
        parts.push(`${kind} ${declaration.getText(ast)};`);
      }
    }
  }
  assert.equal(functions.size, 0, 'Every requested function comes from the real player');
  return parts.join('\n');
}

const payload = {
  problemText: '求面积：30X · 2，原题保持30px。\n第二行题目。', rows: [],
  boardPlan: { canvas: { w: 1726, h: 980 },
    topicLabel: { x: 8, y: 9 }, analysisLabel: { x: 10, y: 40 },
    solutionLabel: { x: 56, y: 11 }, summaryLabel: { x: 58, y: 70 },
    question: {
    x: 6, y: 13.2, w: 44, h: 22, fontSize: 96, fontFamily: 'KaiTi',
    block: { fontSize: 99, fontFamily: 'handwriting' }
  } },
  questionLayout: { fontSize: 88, fontFamily: 'PingFang SC' },
  canvasParams: { fontSize: { question: { px: 120, family: 'handwriting' } },
    fontSource: { handwriting: { choice: 'qiaomu' } } },
  uiSettings: { handwritingFontChoice: 'shaohua' }
};

function verify(html, label) {
  const draws = [], boardDraws = [], imageDraws = [], nodes = new Map();
  const ctx = {
    font: '', clearRect() {}, fillRect() {}, drawImage(...args) { imageDraws.push(args); },
    measureText(text) {
      const px = parseFloat(this.font);
      return { width: [...String(text)].length * px * 0.6,
        fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.3 };
    },
    fillText(text) { draws.push({ text, font: this.font }); }
  };
  const scope = vm.createContext({
    console, ctx, MCTX: { ...ctx }, SHOW_GRID: false, seekHold: false,
    IMG: { canvas: { complete: false }, icons: Object.fromEntries(['题目','分析','解答','总结'].map(stage => [stage, { stage, complete: true, naturalWidth: 100, width: 100, height: 40 }])) }, fontSelEl: null, ROW_CACHE: new Map(),
    localStorage: { getItem: () => null }, warmBoardFonts() {},
    drawProblemImage() {},
    document: { getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {});
      return nodes.get(id);
    } },
    getScratch: () => ({ getContext: () => ({}) }),
    isRuleLine: () => false,
    rowImage(options) {
      boardDraws.push(options);
      return { img: {}, bx: 0, by: 0, bw: 10, bh: 10 };
    }
  });
  vm.runInContext(extract(html), scope);
  // Use both raw legacy data and the real import normalizer. Neither may override question typography.
  for (const normalized of [false, true]) {
    for (const choice of ['lijian', 'qiaomu', 'shaohua']) {
      for (const px of [0, 12, 96, 180]) {
        const data = structuredClone(payload);
        data.canvasParams.fontSize.question.px = px;
        data.boardPlan.question.fontSize = px;
        data.uiSettings.handwritingFontChoice = choice;
        const input = normalized ? scope.normData(data) : data;
        scope.applyFontFromData(normalized ? input : scope.normData(data));
        scope.C = scope.compile(input);
        assert.equal(scope.C.W, 1726);
        assert.equal(scope.C.H, 980);
        draws.length = 0;
        imageDraws.length = 0;
        scope.render(0);
        assert.ok(draws.length > 0, `${label}: actual question text drawn`);
        assert.equal(imageDraws.length, 4, `${label}: all four zone labels stay visible from frame 0`);
        assert.deepEqual(imageDraws.map(args => [args[1], args[2]]), [
          [138.08, 88.2], [172.6, 392], [966.56, 107.8], [1001.08, 686]
        ], `${label}: labels follow current user-adjusted boardPlan positions`);
        assert.ok(draws.every(draw => draw.font === expectedFont), `${label}: ${JSON.stringify(draws[0])}`);
        const cached = scope.C.Q;
        scope.render(0);
        assert.equal(scope.C.Q, cached, `${label}: cached question layout remains valid`);
        // Real board drawing must keep its existing layout size and selected handwriting font.
        for (const stage of ['分析', '解答', '总结']) {
          scope.drawWriting({ coord: '[8%,44%]', content: '板书', seed: 1, spJ: [1],
            lines: ['板书'], layout: [{ x: 20, y: 100, size: 37 }] }, 1, 1726, 980, stage);
          const board = boardDraws.at(-1);
          assert.equal(board.size, 37);
          assert.ok(board.font.includes(choice === 'lijian' ? 'LikeJianJianTi' : choice === 'qiaomu' ? '平方乔木体' : '平方韶华体'));
          assert.equal(board.color, stage === '分析' ? '#dc2626' : '#000000');
        }
      }
    }
  }
  console.log(`PASS ${label}: 24 legacy/import cases, question 30px Microsoft YaHei; four persistent moved labels; cached render; 72 board font/size/color checks`);
}

assert.equal(resolve(currentTemplatePath()), resolve(playerPath), 'Offline export uses public/row-player.html');
verify(source, 'player');
verify(renderDeliverableHtml(payload), 'offline export');
