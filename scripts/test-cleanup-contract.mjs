import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { cleanupGeneratedFiles } from '../server/cleanupHandler.js'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-contract-'))
const publicRoot = path.join(root, 'public')
const dirs = [
  'audio-cache', 'audio', 'pic', 'board-result',
  path.join('..', 'var', 'deliverable'), path.join('..', 'var', 'handoff'),
]
for (const dir of dirs) fs.mkdirSync(path.join(publicRoot, dir), { recursive: true })
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value) }
const json = (file, value) => write(file, JSON.stringify(value, null, 2))
const publicFile = (dir, name) => path.join(publicRoot, dir, name)
const deliverableDir = path.join(root, 'var', 'deliverable')
const handoffDir = path.join(root, 'var', 'handoff')

write(publicFile('audio-cache', 'keep.mp3'), 'keep')
write(publicFile('audio-cache', 'stale.mp3'), 'stale')
write(publicFile('audio', 'stale.mp3'), 'stale')
write(publicFile('pic', 'keep.jpg'), 'keep')
write(publicFile('pic', 'stale.jpg'), 'stale')
const staleTime = new Date(Date.now() - 72 * 60 * 60 * 1000)
fs.utimesSync(publicFile('audio-cache', 'stale.mp3'), staleTime, staleTime)

const payload = { screenshotUrl: '/pic/keep.jpg', rows: [{ audioUrl: '/audio-cache/keep.mp3' }] }
json(publicFile('board-result', 'current.json'), { filename: 'active.json' })
json(publicFile('board-result', 'active.json'), payload)
json(publicFile('board-result', 'old.json'), {})
json(path.join(deliverableDir, 'current.json'), { filename: 'active.json', htmlFilename: 'active.html', deliverable: payload })
write(path.join(deliverableDir, 'active.json'), JSON.stringify(payload))
write(path.join(deliverableDir, 'active.html'), 'active')
write(path.join(deliverableDir, 'old.json'), 'old')
write(path.join(deliverableDir, 'old.html'), 'old')
json(path.join(handoffDir, 'current.json'), { filename: 'active.json' })
json(path.join(handoffDir, 'active.json'), payload)
json(path.join(handoffDir, 'old.json'), {})

try {
  const result = cleanupGeneratedFiles(publicRoot)
  assert.ok(result.files.includes('audio-cache/stale.mp3'))
  assert.ok(!fs.existsSync(publicFile('audio-cache', 'stale.mp3')))
  assert.ok(fs.existsSync(publicFile('audio-cache', 'keep.mp3')))
  assert.ok(fs.existsSync(publicFile('pic', 'keep.jpg')))
  assert.ok(!fs.existsSync(publicFile('pic', 'stale.jpg')))
  assert.ok(!fs.existsSync(publicFile('audio', 'stale.mp3')))
  assert.ok(fs.existsSync(publicFile('board-result', 'active.json')))
  assert.ok(!fs.existsSync(publicFile('board-result', 'old.json')))
  assert.ok(fs.existsSync(path.join(deliverableDir, 'active.json')))
  assert.ok(fs.existsSync(path.join(deliverableDir, 'active.html')))
  assert.ok(!fs.existsSync(path.join(deliverableDir, 'old.json')))
  assert.ok(fs.existsSync(path.join(handoffDir, 'active.json')))
  assert.ok(!fs.existsSync(path.join(handoffDir, 'old.json')))
  console.log(`PASS cleanup contract: kept active assets and removed ${result.count} stale files`)
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
