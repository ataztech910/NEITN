import { describe, it, expect } from 'vitest'
import { loadProject } from '../src/loader'
import { validateProject } from '../src/validator'
import { join } from 'path'

describe('validateProject', () => {
  it('validates valid project without errors', () => {
    const projectDir = join(__dirname, 'fixtures', 'valid-project')
    const { project } = loadProject(projectDir)
    const diagnostics = validateProject(project!)

    expect(diagnostics).toHaveLength(0)
  })

  it('detects duplicate node ids', () => {
    const projectDir = join(__dirname, 'fixtures', 'invalid-project')
    const { project } = loadProject(projectDir)
    const diagnostics = validateProject(project!)

    expect(diagnostics.some(d => d.message.includes('Duplicate node id'))).toBe(true)
  })

  it('detects missing entry node', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: 'missing', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: {}, credentials: {}, ui: { column: 0, row: 0 } }],
      edges: []
    }
    const diagnostics = validateProject(project)

    expect(diagnostics.some(d => d.message.includes('Missing entry node'))).toBe(true)
  })

  it('detects edge to missing node', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: {}, credentials: {}, ui: { column: 0, row: 0 } }],
      edges: [{ from: 'node1', to: 'missing' }]
    }
    const diagnostics = validateProject(project)

    expect(diagnostics.some(d => d.message.includes('Edge to missing node'))).toBe(true)
  })

  it('detects self-loop', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: {}, credentials: {}, ui: { column: 0, row: 0 } }],
      edges: [{ from: 'node1', to: 'node1' }]
    }
    const diagnostics = validateProject(project)

    expect(diagnostics.some(d => d.message.includes('Self-loop edge'))).toBe(true)
  })
})