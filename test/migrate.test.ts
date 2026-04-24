import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { migrate } from '../src/commands/migrate'

function createProjectDir() {
  const dir = mkdtempSync(join('/tmp', 'wf-migrate-'))
  mkdirSync(join(dir, 'nodes'))
  mkdirSync(join(dir, 'edges'))
  writeFileSync(join(dir, 'flow.yaml'), 'id: test\nname: Test\nentry: ""\nsettings: {}\n')
  return dir
}

describe('migrate', () => {
  it('applies pending patch', () => {
    const projectDir = createProjectDir()
    const patchesDir = join(projectDir, '.workflow', 'patches')
    mkdirSync(patchesDir, { recursive: true })

    const patchPath = join(patchesDir, 'test.patch.json')
    writeFileSync(patchPath, JSON.stringify({
      version: 1,
      id: 'test-patch',
      targetProject: 'test',
      summary: 'Test patch',
      operations: [
        {
          op: 'create_file',
          target: 'nodes/test.yaml',
          payload: {
            id: 'test',
            name: 'Test Node',
            type: 'n8n-nodes-base.manualTrigger',
            params: {},
            ui: { column: 1, row: 1 }
          },
          reason: 'Create test node'
        }
      ]
    }))

    const result = migrate(projectDir)
    expect(result.diagnostics).toHaveLength(0)
    expect(result.applied).toBe(1)
    expect(result.skipped).toBe(0)
    expect(existsSync(join(projectDir, 'nodes/test.yaml'))).toBe(true)

    const state = JSON.parse(readFileSync(join(projectDir, '.workflow', 'state', 'applied-patches.json'), 'utf-8'))
    expect(state.applied).toHaveLength(1)
    expect(state.applied[0].id).toBe('test-patch')

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('skips already applied patch', () => {
    const projectDir = createProjectDir()
    const patchesDir = join(projectDir, '.workflow', 'patches')
    mkdirSync(patchesDir, { recursive: true })
    const stateDir = join(projectDir, '.workflow', 'state')
    mkdirSync(stateDir, { recursive: true })

    const patchContent = JSON.stringify({
      version: 1,
      id: 'test-patch',
      targetProject: 'test',
      summary: 'Test patch',
      operations: []
    })
    const sha256 = require('crypto').createHash('sha256').update(patchContent).digest('hex')

    writeFileSync(join(stateDir, 'applied-patches.json'), JSON.stringify({
      version: 1,
      applied: [{
        id: 'test-patch',
        file: join(patchesDir, 'test.patch.json'),
        sha256,
        appliedAt: new Date().toISOString()
      }]
    }))

    writeFileSync(join(patchesDir, 'test.patch.json'), patchContent)

    const result = migrate(projectDir)
    expect(result.diagnostics).toHaveLength(0)
    expect(result.applied).toBe(0)
    expect(result.skipped).toBe(1)

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('rejects modified applied patch', () => {
    const projectDir = createProjectDir()
    const patchesDir = join(projectDir, '.workflow', 'patches')
    mkdirSync(patchesDir, { recursive: true })
    const stateDir = join(projectDir, '.workflow', 'state')
    mkdirSync(stateDir, { recursive: true })

    const originalContent = JSON.stringify({
      version: 1,
      id: 'test-patch',
      targetProject: 'test',
      summary: 'Test patch',
      operations: []
    })
    const sha256 = require('crypto').createHash('sha256').update(originalContent).digest('hex')

    writeFileSync(join(stateDir, 'applied-patches.json'), JSON.stringify({
      version: 1,
      applied: [{
        id: 'test-patch',
        file: join(patchesDir, 'test.patch.json'),
        sha256,
        appliedAt: new Date().toISOString()
      }]
    }))

    // modified content
    writeFileSync(join(patchesDir, 'test.patch.json'), JSON.stringify({
      version: 1,
      id: 'test-patch',
      targetProject: 'test',
      summary: 'Modified patch',
      operations: []
    }))

    const result = migrate(projectDir)
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].message).toContain('different hash')

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('stops on invalid patch', () => {
    const projectDir = createProjectDir()
    const patchesDir = join(projectDir, '.workflow', 'patches')
    mkdirSync(patchesDir, { recursive: true })

    // valid patch
    writeFileSync(join(patchesDir, 'a.patch.json'), JSON.stringify({
      version: 1,
      id: 'a',
      targetProject: 'test',
      summary: 'Valid patch',
      operations: []
    }))

    // invalid patch
    writeFileSync(join(patchesDir, 'b.patch.json'), JSON.stringify({
      version: 1,
      id: 'b',
      targetProject: 'test',
      summary: 'Invalid patch',
      operations: [
        {
          op: 'invalid_op',
          target: 'nodes/test.yaml',
          reason: 'Invalid'
        }
      ]
    }))

    // another valid
    writeFileSync(join(patchesDir, 'c.patch.json'), JSON.stringify({
      version: 1,
      id: 'c',
      targetProject: 'test',
      summary: 'Another valid',
      operations: []
    }))

    const result = migrate(projectDir)
    expect(result.diagnostics.length).toBeGreaterThan(0)
    expect(result.applied).toBe(1) // only the first one applied
    expect(result.skipped).toBe(0)

    const state = JSON.parse(readFileSync(join(projectDir, '.workflow', 'state', 'applied-patches.json'), 'utf-8'))
    expect(state.applied).toHaveLength(1)
    expect(state.applied[0].id).toBe('a')

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('applies patches in deterministic order', () => {
    const projectDir = createProjectDir()
    const patchesDir = join(projectDir, '.workflow', 'patches')
    mkdirSync(patchesDir, { recursive: true })

    // create patches in reverse order
    writeFileSync(join(patchesDir, 'c.patch.json'), JSON.stringify({
      version: 1,
      id: 'c',
      targetProject: 'test',
      summary: 'Patch C',
      operations: []
    }))

    writeFileSync(join(patchesDir, 'a.patch.json'), JSON.stringify({
      version: 1,
      id: 'a',
      targetProject: 'test',
      summary: 'Patch A',
      operations: []
    }))

    writeFileSync(join(patchesDir, 'b.patch.json'), JSON.stringify({
      version: 1,
      id: 'b',
      targetProject: 'test',
      summary: 'Patch B',
      operations: []
    }))

    const result = migrate(projectDir)
    expect(result.diagnostics).toHaveLength(0)
    expect(result.applied).toBe(3)
    expect(result.skipped).toBe(0)

    const state = JSON.parse(readFileSync(join(projectDir, '.workflow', 'state', 'applied-patches.json'), 'utf-8'))
    expect(state.applied).toHaveLength(3)
    expect(state.applied[0].id).toBe('a')
    expect(state.applied[1].id).toBe('b')
    expect(state.applied[2].id).toBe('c')

    rmSync(projectDir, { recursive: true, force: true })
  })
})