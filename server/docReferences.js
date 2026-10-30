import { readFileSync } from 'node:fs'
import { resolve } from "path"

export const AGENT_A_KNOWLEDGE_BASE = JSON.parse(
  readFileSync(resolve(process.cwd(), 'doc/knowledge-a.compact.json'), 'utf8'),
)
