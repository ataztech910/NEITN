import { describe, it, expect, afterEach } from 'vitest'
import { loadProject } from '../src/loader'
import { join } from 'path'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'

describe('loadProject', () => {
  it('loads valid project successfully', () => {
    const projectDir = join(__dirname, 'fixtures', 'valid-project')
    const { project, diagnostics } = loadProject(projectDir)

    expect(diagnostics).toHaveLength(0)
    expect(project).toBeDefined()
    expect(project!.flow.id).toBe('test_workflow')
    expect(project!.flow.entry).toBe('manual-trigger')
    expect(project!.nodes).toHaveLength(3)
    expect(project!.edges).toHaveLength(2)
  })

  it('returns diagnostics for invalid project', () => {
    const projectDir = join(__dirname, 'fixtures', 'invalid-project')
    const { project, diagnostics } = loadProject(projectDir)

    expect(project).toBeDefined()
    expect(diagnostics).toHaveLength(0) // loader doesn't validate, just loads
  })

  it('returns diagnostics for missing flow.yaml', () => {
    const projectDir = '/nonexistent'
    const { project, diagnostics } = loadProject(projectDir)

    expect(project).toBeUndefined()
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toBe('Missing flow.yaml')
  })

  it('parses empty edge connections array as no edges', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'edge-loader-'))
    mkdirSync(join(projectDir, 'nodes'))
    mkdirSync(join(projectDir, 'edges'))
    writeFileSync(join(projectDir, 'flow.yaml'), 'id: x\nname: X\nentry: ""\nsettings: {}\n')
    writeFileSync(join(projectDir, 'edges', 'main.yaml'), 'connections: []\n')

    const { project, diagnostics } = loadProject(projectDir)
    rmSync(projectDir, { recursive: true, force: true })

    expect(diagnostics).toHaveLength(0)
    expect(project).toBeDefined()
    expect(project!.edges).toHaveLength(0)
  })

  it('reports EDGE_INVALID_SHAPE once for malformed edge item', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'edge-loader-'))
    mkdirSync(join(projectDir, 'nodes'))
    mkdirSync(join(projectDir, 'edges'))
    writeFileSync(join(projectDir, 'flow.yaml'), 'id: x\nname: X\nentry: ""\nsettings: {}\n')
    writeFileSync(join(projectDir, 'edges', 'bad.yaml'), 'from: node1\n')

    const { project, diagnostics } = loadProject(projectDir)
    rmSync(projectDir, { recursive: true, force: true })

    expect(project).toBeDefined()
    expect(diagnostics.filter(d => d.message === 'EDGE_INVALID_SHAPE')).toHaveLength(1)
    expect(diagnostics.some(d => d.message.includes('undefined'))).toBe(false)
  })

  it('loads valid connection objects from edges files', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'edge-loader-'))
    mkdirSync(join(projectDir, 'nodes'))
    mkdirSync(join(projectDir, 'edges'))
    writeFileSync(join(projectDir, 'flow.yaml'), 'id: x\nname: X\nentry: ""\nsettings: {}\n')
    writeFileSync(
      join(projectDir, 'edges', 'main.yaml'),
      'connections:\n  - from: node1\n    to: node2\n'
    )

    const { project, diagnostics } = loadProject(projectDir)
    rmSync(projectDir, { recursive: true, force: true })

    expect(diagnostics).toHaveLength(0)
    expect(project).toBeDefined()
    expect(project!.edges).toEqual([{ from: 'node1', to: 'node2' }])
  })
})