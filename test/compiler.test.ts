import { describe, it, expect, vi } from 'vitest'
import { loadProject } from '../src/loader'
import { compileProject } from '../src/compiler'
import { join } from 'path'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'

describe('compileProject', () => {
  it('compiles valid project to n8n workflow JSON', () => {
    const projectDir = join(__dirname, 'fixtures', 'valid-project')
    const { project } = loadProject(projectDir)
    const workflow = compileProject(project!)

    expect(workflow.name).toBe('Test Workflow')
    expect(workflow.active).toBe(false)
    expect(workflow.nodes).toHaveLength(3)
    expect(workflow.connections).toHaveProperty('Manual Trigger')
    expect(workflow.connections).toHaveProperty('HTTP Request')
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

  it('prefers absolute ui.x/ui.y positions when present', () => {
    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        {
          id: 'node1',
          name: 'Node 1',
          type: 'test',
          params: {},
          ui: { x: -2260, y: 120 }
        }
      ],
      edges: []
    }

    const workflow = compileProject(project)
    expect(workflow.nodes[0].position).toEqual([-2260, 120])
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
    expect(workflow.connections['IF Check']).toEqual({
      main: [
        [
          { node: 'Send OK', type: 'main', index: 0 }
        ],
        [
          { node: 'Send Fail', type: 'main', index: 0 }
        ]
      ]
    })
  })

  it.each([2, 2.2, 4.2])('uses node.typeVersion when provided: %s', (typeVersion) => {
    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        {
          id: 'node1',
          name: 'Node 1',
          type: 'test',
          typeVersion,
          params: {},
          credentials: {},
          ui: { column: 1, row: 1 }
        }
      ],
      edges: []
    }

    const workflow = compileProject(project)
    expect(workflow.nodes[0].typeVersion).toBe(typeVersion)
  })

  it('merges extra top-level node fields into compiled output', () => {
    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        {
          id: 'webhook_lead',
          name: 'Webhook Lead',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          params: { path: 'lead-intake' },
          extra: { webhookId: 'idea-evaluator', notesInFlow: true },
          ui: { column: 1, row: 1 }
        }
      ],
      edges: []
    }

    const workflow = compileProject(project)
    expect(workflow.nodes[0]).toMatchObject({
      typeVersion: 2,
      webhookId: 'idea-evaluator',
      notesInFlow: true
    })
  })

  it('converts string credentials into safe name references', () => {
    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        {
          id: 'http_request',
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
          params: {},
          credentials: {
            httpHeaderAuth: 'anthropic_header_auth'
          },
          ui: { column: 1, row: 1 }
        }
      ],
      edges: []
    }

    const workflow = compileProject(project)
    expect(workflow.nodes[0].credentials).toEqual({
      httpHeaderAuth: { name: 'anthropic_header_auth' }
    })
  })

  it('fails when extra overrides a protected field', () => {
    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        {
          id: 'node1',
          name: 'Node 1',
          type: 'test',
          params: {},
          extra: { id: 'overridden' },
          ui: { column: 1, row: 1 }
        }
      ],
      edges: []
    }

    expect(() => compileProject(project)).toThrow(/protected field: id/)
  })

  it('injects compiled jsCode and removes jsCodeFrom', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'compiler-code-'))
    mkdirSync(join(projectDir, 'dist', 'code'), { recursive: true })
    writeFileSync(join(projectDir, 'dist', 'code', 'normalize_input.js'), 'module.exports = {};')

    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        {
          id: 'normalize_input',
          name: 'Normalize Input',
          type: 'n8n-nodes-base.code',
          params: { jsCodeFrom: 'code/normalize_input.ts' },
          ui: { column: 1, row: 1 }
        }
      ],
      edges: []
    }

    const workflow = compileProject(project, projectDir)
    expect(workflow.nodes[0].parameters.jsCode).toContain('module.exports = {};')
    expect(workflow.nodes[0].parameters.jsCodeFrom).toBeUndefined()

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('fails when compiled jsCode output is empty', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'compiler-code-'))
    mkdirSync(join(projectDir, 'dist', 'code'), { recursive: true })
    writeFileSync(join(projectDir, 'dist', 'code', 'normalize_input.js'), '   \n')

    const project = {
      flow: { id: 'test', name: 'Test', entry: '', settings: {} },
      nodes: [
        {
          id: 'normalize_input',
          name: 'Normalize Input',
          type: 'n8n-nodes-base.code',
          params: { jsCodeFrom: 'code/normalize_input.ts' },
          ui: { column: 1, row: 1 }
        }
      ],
      edges: []
    }

    expect(() => compileProject(project, projectDir)).toThrow(/Empty compiled code file/)
    rmSync(projectDir, { recursive: true, force: true })
  })
})
