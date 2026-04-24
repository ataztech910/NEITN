import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import * as yaml from 'js-yaml'
import { importWorkflow } from '../src/commands/import'
import { loadProject } from '../src/loader'
import { validateProject } from '../src/validator'
import { compile } from '../src/commands/compile'

function normalizeConnections(connections: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(connections)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([from, value]) => [
        from,
        {
          main: (value.main ?? []).map((group: any[]) =>
            [...group]
              .sort((left, right) => String(left.node).localeCompare(String(right.node)))
              .map(item => ({ node: item.node, type: item.type, index: item.index }))
          )
        }
      ])
  )
}

function createWorkflowFixture() {
  return {
    name: 'Idea Evaluator MVP',
    settings: {
      executionOrder: 'v1'
    },
    pinData: {
      Webhook: [{ json: { seeded: true } }]
    },
    versionId: 'workflow-version-1',
    meta: {
      templateId: 'template-123'
    },
    tags: [
      { name: 'imported' }
    ],
    active: false,
    nodes: [
      {
        id: '1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [-2260, 0],
        parameters: {
          path: 'idea-evaluator'
        },
        webhookId: 'idea-evaluator'
      },
      {
        id: '2',
        name: 'Normalize Input',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [-1960, 0],
        parameters: {
          jsCode: 'const item = $input.first();\nreturn [{ json: item.json }];'
        }
      },
      {
        id: '3',
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [-1660, 0],
        parameters: {
          method: 'POST',
          url: '={{ $json.url }}'
        },
        credentials: {
          httpHeaderAuth: {
            id: 'abc',
            name: 'Anthropic Header Auth'
          }
        }
      },
      {
        id: '4',
        name: 'If Check',
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [-1360, 0],
        parameters: {
          conditions: {
            boolean: [
              {
                value1: '={{ $json.ok }}',
                value2: true
              }
            ]
          }
        },
        notesInFlow: true
      },
      {
        id: '5',
        name: 'Success',
        type: 'n8n-nodes-base.set',
        position: [-1060, -120],
        parameters: {
          values: {
            string: [
              { name: 'status', value: 'success' }
            ]
          }
        }
      },
      {
        id: '6',
        name: 'Failure',
        type: 'n8n-nodes-base.set',
        position: [-1060, 120],
        parameters: {
          values: {
            string: [
              { name: 'status', value: 'failure' }
            ]
          }
        }
      }
    ],
    connections: {
      Webhook: {
        main: [
          [
            { node: 'Normalize Input', type: 'main', index: 0 }
          ]
        ]
      },
      'Normalize Input': {
        main: [
          [
            { node: 'HTTP Request', type: 'main', index: 0 }
          ]
        ]
      },
      'HTTP Request': {
        main: [
          [
            { node: 'If Check', type: 'main', index: 0 }
          ]
        ]
      },
      'If Check': {
        main: [
          [
            { node: 'Success', type: 'main', index: 0 }
          ],
          [
            { node: 'Failure', type: 'main', index: 0 }
          ]
        ]
      }
    }
  }
}

describe('importWorkflow', () => {
  it('imports existing n8n workflow into DSL files and compiles back', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'wf-import-'))
    const workflowPath = join(projectDir, 'existing-workflow.json')
    writeFileSync(workflowPath, JSON.stringify(createWorkflowFixture(), null, 2))

    importWorkflow(workflowPath, projectDir)

    expect(existsSync(join(projectDir, 'flow.yaml'))).toBe(true)
    expect(existsSync(join(projectDir, 'nodes', 'webhook.yaml'))).toBe(true)
    expect(existsSync(join(projectDir, 'nodes', 'normalize_input.yaml'))).toBe(true)
    expect(existsSync(join(projectDir, 'code', 'normalize_input.ts'))).toBe(true)
    expect(readFileSync(join(projectDir, 'code', 'normalize_input.ts'), 'utf-8')).toContain('const item = $input.first();')

    const flow = yaml.load(readFileSync(join(projectDir, 'flow.yaml'), 'utf-8')) as any
    expect(flow.id).toBe('idea_evaluator_mvp')
    expect(flow.entry).toBe('webhook')
    expect(flow.settings).toEqual({ executionOrder: 'v1' })
    expect(flow.extra).toEqual({
      pinData: { Webhook: [{ json: { seeded: true } }] },
      versionId: 'workflow-version-1',
      meta: { templateId: 'template-123' },
      tags: [{ name: 'imported' }]
    })

    const webhookNode = yaml.load(readFileSync(join(projectDir, 'nodes', 'webhook.yaml'), 'utf-8')) as any
    expect(webhookNode.typeVersion).toBe(2)
    expect(webhookNode.extra).toEqual({ webhookId: 'idea-evaluator' })
    expect(webhookNode.ui).toEqual({ x: -2260, y: 0 })

    const httpNode = yaml.load(readFileSync(join(projectDir, 'nodes', 'http_request.yaml'), 'utf-8')) as any
    expect(httpNode.typeVersion).toBe(4.2)
    expect(httpNode.credentials).toEqual({ httpHeaderAuth: 'Anthropic Header Auth' })
    expect(httpNode.params).toEqual({
      method: 'POST',
      url: '={{ $json.url }}'
    })

    const ifNode = yaml.load(readFileSync(join(projectDir, 'nodes', 'if_check.yaml'), 'utf-8')) as any
    expect(ifNode.extra).toEqual({ notesInFlow: true })

    const edges = yaml.load(readFileSync(join(projectDir, 'edges', 'main.yaml'), 'utf-8')) as any
    expect(edges.connections).toEqual([
      { from: 'webhook', to: 'normalize_input' },
      { from: 'normalize_input', to: 'http_request' },
      { from: 'http_request', to: 'if_check' },
      { from: 'if_check', to: 'success', branch: 'true' },
      { from: 'if_check', to: 'failure', branch: 'false' }
    ])

    const { project, diagnostics: loadDiagnostics } = loadProject(projectDir)
    expect(loadDiagnostics).toHaveLength(0)
    expect(project).toBeDefined()
    expect(validateProject(project!, projectDir)).toHaveLength(0)

    await compile(projectDir)

    const compiled = JSON.parse(readFileSync(join(projectDir, 'dist', 'idea_evaluator_mvp.workflow.json'), 'utf-8'))
    const compiledWebhook = compiled.nodes.find((node: any) => node.id === 'webhook')
    const compiledHttp = compiled.nodes.find((node: any) => node.id === 'http_request')
    const compiledCode = compiled.nodes.find((node: any) => node.id === 'normalize_input')
    const original = createWorkflowFixture()

    expect(compiledWebhook.webhookId).toBe('idea-evaluator')
    expect(compiledWebhook.position).toEqual([-2260, 0])
    expect(compiledHttp.typeVersion).toBe(4.2)
    expect(compiledHttp.parameters).toEqual(original.nodes.find(node => node.name === 'HTTP Request')!.parameters)
    expect(compiledCode.parameters.jsCode).toContain('const item = $input.first();')
    expect(compiledCode.parameters.jsCodeFrom).toBeUndefined()
    expect(compiled.nodes.map((node: any) => node.name).sort()).toEqual([
      'Failure',
      'HTTP Request',
      'If Check',
      'Normalize Input',
      'Success',
      'Webhook'
    ])
    expect(compiled.connections).toHaveProperty('Webhook')
    expect(compiled.connections).toHaveProperty('If Check')
    expect(compiled.connections.Webhook.main[0][0].node).toBe('Normalize Input')
    expect(compiled.connections['If Check'].main[0][0].node).toBe('Success')
    expect(compiled.connections['If Check'].main[1][0].node).toBe('Failure')
    expect(compiled.connections).not.toHaveProperty('webhook')
    expect(normalizeConnections(compiled.connections)).toEqual(normalizeConnections(original.connections))
    expect(compiled.pinData).toEqual(original.pinData)
    expect(compiled.versionId).toBe(original.versionId)
    expect(compiled.meta).toEqual(original.meta)
    expect(compiled.tags).toEqual(original.tags)

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('fails if target files already exist without overwrite', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'wf-import-'))
    const workflowPath = join(projectDir, 'existing-workflow.json')
    writeFileSync(workflowPath, JSON.stringify(createWorkflowFixture(), null, 2))
    mkdirSync(join(projectDir, 'nodes'))
    writeFileSync(join(projectDir, 'flow.yaml'), 'id: existing\nname: Existing\nentry: ""\nsettings: {}\n')

    expect(() => importWorkflow(workflowPath, projectDir)).toThrow(/Target file already exists/)

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('overwrite clears stale imported nodes before writing the new workflow', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'wf-import-'))
    const workflowPath = join(projectDir, 'existing-workflow.json')
    writeFileSync(join(projectDir, 'flow.yaml'), 'id: stale\nname: Stale\nentry: "code_test"\nsettings: {}\n')
    mkdirSync(join(projectDir, 'nodes'))
    mkdirSync(join(projectDir, 'edges'))
    mkdirSync(join(projectDir, 'code'))
    writeFileSync(
      join(projectDir, 'nodes', 'code_test.yaml'),
      'id: code_test\nname: Code Test\ntype: n8n-nodes-base.code\nparams: {}\nui:\n  column: 1\n  row: 1\n'
    )
    writeFileSync(join(projectDir, 'edges', 'main.yaml'), 'connections:\n  - from: code_test\n    to: code_test\n')
    writeFileSync(join(projectDir, 'code', 'code_test.ts'), 'return items;\n')
    writeFileSync(workflowPath, JSON.stringify(createWorkflowFixture(), null, 2))

    importWorkflow(workflowPath, projectDir, { overwrite: true })
    await compile(projectDir)

    const compiled = JSON.parse(readFileSync(join(projectDir, 'dist', 'idea_evaluator_mvp.workflow.json'), 'utf-8'))
    expect(compiled.nodes.some((node: any) => node.name === 'Code Test')).toBe(false)
    expect(existsSync(join(projectDir, 'nodes', 'code_test.yaml'))).toBe(false)

    rmSync(projectDir, { recursive: true, force: true })
  })
})
