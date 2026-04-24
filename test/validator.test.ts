import { describe, it, expect } from 'vitest'
import { loadProject } from '../src/loader'
import { validateProject } from '../src/validator'
import { join } from 'path'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'

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

  it('accepts numeric node.typeVersion values', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', typeVersion: 4.2, params: {}, credentials: {}, ui: { column: 0, row: 0 } }],
      edges: []
    }

    const diagnostics = validateProject(project)
    expect(diagnostics.some(d => d.message.includes('typeVersion'))).toBe(false)
  })

  it('detects non-numeric node.typeVersion', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', typeVersion: '4.2', params: {}, credentials: {}, ui: { column: 0, row: 0 } }],
      edges: []
    }

    const diagnostics = validateProject(project as any)
    expect(diagnostics.some(d => d.message.includes('typeVersion must be a number'))).toBe(true)
  })

  it('detects non-object extra', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: {}, extra: 'bad', ui: { column: 0, row: 0 } }],
      edges: []
    }

    const diagnostics = validateProject(project as any)
    expect(diagnostics.some(d => d.message.includes('extra must be an object'))).toBe(true)
  })

  it('detects protected keys in extra', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: {}, extra: { id: 'override' }, ui: { column: 0, row: 0 } }],
      edges: []
    }

    const diagnostics = validateProject(project)
    expect(diagnostics.some(d => d.message.includes('extra must not override protected field: id'))).toBe(true)
  })

  it('accepts string credential references', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: {}, credentials: { httpHeaderAuth: 'anthropic_header_auth' }, ui: { column: 0, row: 0 } }],
      edges: []
    }

    const diagnostics = validateProject(project)
    expect(diagnostics.some(d => d.message.includes('credential'))).toBe(false)
  })

  it('detects unsafe credential references', () => {
    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: {}, credentials: { httpHeaderAuth: { token: 'secret' } }, ui: { column: 0, row: 0 } }],
      edges: []
    }

    const diagnostics = validateProject(project as any)
    expect(diagnostics.some(d => d.message.includes('credential httpHeaderAuth must be a string or safe reference object'))).toBe(true)
  })

  it('accepts jsCodeFrom paths ending with .js', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'validator-code-'))
    mkdirSync(join(projectDir, 'code'))
    writeFileSync(join(projectDir, 'code', 'normalize_input.js'), 'module.exports = {};')

    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: { jsCodeFrom: 'code/normalize_input.js' }, ui: { column: 0, row: 0 } }],
      edges: []
    }

    const diagnostics = validateProject(project, projectDir)
    expect(diagnostics.some(d => d.message.includes('jsCodeFrom'))).toBe(false)

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('detects missing jsCodeFrom source files', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'validator-code-'))
    mkdirSync(join(projectDir, 'code'))

    const project = {
      flow: { id: 'test', name: 'test', entry: '', settings: {} },
      nodes: [{ id: 'node1', name: 'Node1', type: 'test', params: { jsCodeFrom: 'code/missing.ts' }, ui: { column: 0, row: 0 } }],
      edges: []
    }

    const diagnostics = validateProject(project, projectDir)
    expect(diagnostics.some(d => d.message.includes('jsCodeFrom file not found'))).toBe(true)

    rmSync(projectDir, { recursive: true, force: true })
  })
})
