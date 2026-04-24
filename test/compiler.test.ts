import { describe, it, expect, vi } from 'vitest'
import { loadProject } from '../src/loader'
import { compileProject } from '../src/compiler'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

describe('compileProject', () => {
  it('compiles valid project to n8n workflow JSON', () => {
    const projectDir = join(__dirname, 'fixtures', 'valid-project')
    const { project } = loadProject(projectDir)
    const workflow = compileProject(project!)

    expect(workflow.name).toBe('Test Workflow')
    expect(workflow.active).toBe(false)
    expect(workflow.nodes).toHaveLength(3)
    expect(workflow.connections).toHaveProperty('manual-trigger')
    expect(workflow.connections).toHaveProperty('http-request')
  })

  it('matches golden output', () => {
    const projectDir = join(__dirname, 'fixtures', 'valid-project')
    const { project } = loadProject(projectDir)
    const workflow = compileProject(project!)

    const goldenPath = join(projectDir, 'dist', 'test_workflow.workflow.json')
    const goldenContent = readFileSync(goldenPath, 'utf-8')
    const expected = JSON.parse(goldenContent)

    expect(workflow).toEqual(expected)
  })

  it('maps ui.row to y position at 200px intervals', () => {
    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        {
          id: 'node1',
          name: 'Node 1',
          type: 'test',
          params: {},
          credentials: {},
          ui: { column: 1, row: 1 }
        }
      ],
      edges: []
    }

    const workflow = compileProject(project)
    expect(workflow.nodes[0].position).toEqual([300, 200])
  })

  it('compiles true/false branch connections into separate output slots', () => {
    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        { id: 'if_check', name: 'IF Check', type: 'test', params: {}, credentials: {}, ui: { column: 0, row: 0 } },
        { id: 'send_ok', name: 'Send OK', type: 'test', params: {}, credentials: {}, ui: { column: 1, row: 0 } },
        { id: 'send_fail', name: 'Send Fail', type: 'test', params: {}, credentials: {}, ui: { column: 1, row: 1 } }
      ],
      edges: [
        { from: 'if_check', to: 'send_ok', branch: 'true' },
        { from: 'if_check', to: 'send_fail', branch: 'false' }
      ]
    }

    const workflow = compileProject(project)
    expect(workflow.connections.if_check).toEqual({
      main: [
        [
          { node: 'send_ok', type: 'main', index: 0 }
        ],
        [
          { node: 'send_fail', type: 'main', index: 0 }
        ]
      ]
    })
  })
})