import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const html = readFileSync(new URL('../public/row-player.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).find(text => text.includes('function startRow(i)'));
assert.ok(script, 'Use the real player script');
new vm.Script(script);
const ast = ts.createSourceFile('player.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['compile', 'now', 'uiNow', 'playAudioWhenReady', 'startRow', 'loop', 'play', 'pause', 'seekTo', 'load']);
const parts = ast.statements.filter(statement =>
  (ts.isFunctionDeclaration(statement) && names.has(statement.name?.text)) ||
  (ts.isExpressionStatement(statement) && /^audioEl\.onended\s*=/.test(statement.getText(ast)))
).map(statement => statement.getText(ast));
assert.equal(parts.length, names.size + 1, 'Extract every production function and ended handler');

function player(audio = true, count = 2, deferReady = false) {
  let clock = 0, serial = 0;
  const pending = new Map(), button = {};
  const audioEl = {
    currentTime: 0, paused: true, src: '', readyState: 0, playCount: 0, listeners: new Map(),
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    removeEventListener(type) { this.listeners.delete(type); },
    load() { this.readyState = deferReady ? 1 : 4; if (!deferReady) this.listeners.get('canplaythrough')?.(); },
    play() { this.paused = false; this.playCount++; return Promise.resolve(); },
    pause() { this.paused = true; },
    getAttribute() { return this.src; }
  };
  const context = vm.createContext({
    audioEl, performance: { now: () => clock },
    document: { getElementById: () => button },
    requestAnimationFrame(callback) { pending.set(++serial, callback); return serial; },
    cancelAnimationFrame(id) { pending.delete(id); },
    fontReady: () => true, render() {}, syncDocTitle() {}, warmBoardFonts() {},
    resolveTagAnchor: () => null, isAudioSrc: () => true, compactActionsIntoWindow() {},
    data: { rows: Array.from({ length: count }, (_, i) => ({
      speech: `row ${i}`, audioDurationMs: 2000, ...(audio ? { mp3: `/audio-cache/row-${i}.mp3` } : {})
    })) }
  });
  vm.runInContext(`let C=null,T=0,playing=false,rafId=0,rowIdx=0,rowAnchor=0,rowT0=0,rowHasAudio=false,audioReadyToken=0,pausedCur=null;
    ${parts.join('\n')}
    load(data);`, context);
  return {
    audio: audioEl,
    run(code) { return vm.runInContext(code, context); },
    frame(ms) {
      clock += ms;
      const callbacks = [...pending.values()]; pending.clear();
      callbacks.forEach(callback => callback(clock));
    },
    end() { audioEl.currentTime = 2; audioEl.paused = true; audioEl.onended(); }
  };
}

const gated = player(true, 2, true);
gated.run('play()');
assert.equal(gated.audio.playCount, 0, 'Audio must wait for canplaythrough before playback');
gated.audio.readyState = 4;
gated.audio.listeners.get('canplaythrough')?.();
assert.equal(gated.audio.playCount, 1, 'Audio starts after canplaythrough');

const voiced = player();
assert.equal(voiced.run('C.total'), 5000, 'Two 2s rows include exactly one 1s gap');
assert.equal(voiced.audio.playCount, 0, 'Audio waits for canplaythrough before first play');
voiced.audio.listeners.get('canplaythrough')?.();
voiced.run('play()'); voiced.frame(7000);
assert.equal(voiced.run('rowIdx'), 0, 'Wall clock must never truncate unfinished audio');
voiced.end();
assert.equal(voiced.run('rowIdx'), 0, 'Audio end must retain current row');
voiced.frame(999); assert.equal(voiced.run('rowIdx'), 0);
voiced.frame(1); assert.equal(voiced.run('rowIdx'), 1, 'Next audio starts after 1s');
voiced.end(); assert.equal(voiced.run('playing'), false, 'Last row ends without trailing gap');
assert.equal(voiced.run('pausedCur'), 5000);
voiced.run('play()'); assert.equal(voiced.run('rowIdx'), 0, 'Replay starts at first row');

const paused = player();
paused.run('play()'); paused.end(); paused.frame(400); paused.run('pause()');
paused.frame(5000); assert.equal(paused.run('uiNow()'), 2400, 'Pause freezes the gap');
paused.run('play()'); assert.equal(paused.audio.playCount, 1, 'Resume gap must not replay audio');
paused.frame(599); assert.equal(paused.run('rowIdx'), 0);
paused.frame(1); assert.equal(paused.run('rowIdx'), 1, 'Resume waits only remaining gap');

const seek = player();
seek.run('play(); seekTo(2500)');
assert.equal(seek.run('rowIdx'), 0, 'Seek inside gap keeps preceding row');
assert.equal(seek.audio.paused, true);
seek.frame(499); assert.equal(seek.run('rowIdx'), 0);
seek.frame(1); assert.equal(seek.run('rowIdx'), 1);
seek.run('seekTo(1200)'); assert.equal(seek.audio.currentTime, 1.2);
seek.run('pause(); play()'); assert.equal(seek.audio.currentTime, 1.2, 'Resume audio preserves position');
seek.run('seekTo(3500)'); assert.equal(seek.run('rowIdx'), 1); assert.equal(seek.audio.currentTime, 0.5);

const silent = player(false);
silent.run('play()'); silent.frame(2000); assert.equal(silent.run('rowIdx'), 0);
silent.frame(1000); assert.equal(silent.run('rowIdx'), 1, 'Silent rows also wait exactly 1s');
silent.frame(2000); assert.equal(silent.run('playing'), false);

const reload = player();
reload.run('play()'); reload.end(); reload.frame(500);
reload.run('pause(); load(data); play()'); reload.audio.onended();
assert.equal(reload.run('rowIdx'), 0, 'Reload has no delayed jump left over');

const single = player(true, 1);
assert.equal(single.run('C.total'), 2000, 'Single row has no gap');
single.run('play()'); single.end(); assert.equal(single.run('playing'), false);
console.log('PASS: real player syntax, 1s row gaps, pause/resume, gap/audio seek, silent rows, reload, final row, replay');
