import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { installAgents } from '../src/agents'

describe('installAgents', () => {
  let projectDir: string | undefined

  afterEach(() => {
    vi.restoreAllMocks()
    if (projectDir) {
      rmSync(projectDir, { recursive: true, force: true })
      projectDir = undefined
    }
  })

  it('copies bundled AI contract files into the target project', () => {
    projectDir = mkdtempSync(join(tmpdir(), 'neitn-agents-'))

    installAgents(projectDir)

    expect(existsSync(join(projectDir, '.agents', 'AGENTS.md'))).toBe(true)
    expect(existsSync(join(projectDir, '.agents', 'skills', 'neitn', 'SKILL.md'))).toBe(true)
    expect(existsSync(join(projectDir, 'docs', 'neitn', 'README.md'))).toBe(true)
    expect(existsSync(join(projectDir, 'AGENTS.md'))).toBe(false)
  })

  it('adds a Codex root AGENTS.md when ai=codex', () => {
    projectDir = mkdtempSync(join(tmpdir(), 'neitn-codex-'))

    installAgents(projectDir, { ai: 'codex' })

    const agentsPath = join(projectDir, 'AGENTS.md')
    expect(existsSync(agentsPath)).toBe(true)
    expect(readFileSync(agentsPath, 'utf8')).toContain('.agents/skills/neitn/SKILL.md')
    expect(readFileSync(agentsPath, 'utf8')).toContain('Patch Schema v0')
  })
})
