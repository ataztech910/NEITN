import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'
import { applyPatch, loadPatchFile, PatchFile } from '../src/patch'

function createProjectDir() {
  const dir = mkdtempSync(join('/tmp', 'wf-'))
  mkdirSync(join(dir, 'nodes'))
  mkdirSync(join(dir, 'edges'))
  return dir
}

function writeFlow(dir: string, id = 'test', name = 'Test', entry = '') {
  writeFileSync(join(dir, 'flow.yaml'), `id: ${id}\nname: ${name}\nentry: "${entry}"\nsettings: {}\n`)
}

describe('applyPatch', () => {
  it('loads patch files with op/target/changes aliases', () => {
    const patchFile = mkdtempSync(join('/tmp', 'wf-patch-'))
    const patchPath = join(patchFile, 'test.patch.json')
    writeFileSync(
      patchPath,
      JSON.stringify({
        version: 1,
        targetProject: 'test',
        summary: 'Alias patch syntax',
        operations: [
          {
            op: 'assert_exists',
            target: 'flow.yaml',
            reason: 'Check flow exists'
          }
        ]
      })
    )

    const { patch, diagnostics } = loadPatchFile(patchPath)
    expect(diagnostics).toHaveLength(0)
    expect(patch).toBeDefined()
    expect(patch!.operations[0].type).toBe('assert_exists')
    rmSync(patchFile, { recursive: true, force: true })
  })

  it('loads create_file patch files using payload and serializes YAML', () => {
    const projectDir = createProjectDir()
    writeFlow(projectDir)

    const patchFile = mkdtempSync(join('/tmp', 'wf-patch-'))
    const patchPath = join(patchFile, 'create-file.patch.json')
    writeFileSync(
      patchPath,
      JSON.stringify({
        version: 1,
        targetProject: 'test',
        summary: 'Create logger node',
        operations: [
          {
            op: 'create_file',
            target: 'nodes/log_response.yaml',
            payload: {
              id: 'log_response',
              name: 'Log Response',
              type: 'n8n-nodes-base.code',
              params: {
                jsCode: 'return items;'
              },
              ui: {
                column: 3,
                row: 2
              }
            },
            reason: 'Create logger node'
          }
        ]
      })
    )

    const { patch, diagnostics } = loadPatchFile(patchPath)
    expect(diagnostics).toHaveLength(0)
    expect(patch).toBeDefined()
    expect(patch!.operations[0].type).toBe('create_file')

    const result = applyPatch(projectDir, patch!)
    expect(result.diagnostics).toHaveLength(0)
    const file = readFileSync(join(projectDir, 'nodes/log_response.yaml'), 'utf-8')
    const doc: any = yaml.load(file)
    expect(doc.id).toBe('log_response')
    expect(doc.type).toBe('n8n-nodes-base.code')

    rmSync(patchFile, { recursive: true, force: true })
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('creates a new node file', () => {
    const projectDir = createProjectDir()
    writeFlow(projectDir)

    const patch: PatchFile = {
      version: '0.1.0',
      targetProject: 'test',
      summary: 'Create node',
      operations: [
        {
          type: 'create_file',
          path: 'nodes/new-node.yaml',
          payload: {
            id: 'new_node',
            name: 'New Node',
            type: 'n8n-nodes-base.manualTrigger',
            params: {},
            credentials: {},
            ui: {
              column: 0,
              row: 0
            }
          },
          reason: 'Create node file'
        }
      ]
    }

    const result = applyPatch(projectDir, patch)
    expect(result.diagnostics).toHaveLength(0)
    expect(existsSync(join(projectDir, 'nodes/new-node.yaml'))).toBe(true)
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('updates node params using update_fields', () => {
    const projectDir = createProjectDir()
    writeFlow(projectDir)
    writeFileSync(
      join(projectDir, 'nodes/http-request.yaml'),
      'id: http_request\nname: HTTP Request\ntype: n8n-nodes-base.httpRequest\nparams:\n  method: GET\n  url: https://httpbin.org/get\ncredentials: {}\nui:\n  column: 1\n  row: 0\n'
    )

    const patch: PatchFile = {
      version: '0.1.0',
      targetProject: 'test',
      summary: 'Update HTTP method',
      operations: [
        {
          type: 'update_fields',
          path: 'nodes/http-request.yaml',
          updates: {
            'params.method': 'POST',
            'params.url': 'https://example.com/post'
          },
          reason: 'Update request method and URL'
        }
      ]
    }

    const result = applyPatch(projectDir, patch)
    expect(result.diagnostics).toHaveLength(0)
    const file = readFileSync(join(projectDir, 'nodes/http-request.yaml'), 'utf-8')
    const doc: any = yaml.load(file)
    expect(doc.params.method).toBe('POST')
    expect(doc.params.url).toBe('https://example.com/post')
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('inserts a node and updates edges', () => {
    const projectDir = createProjectDir()
    writeFlow(projectDir)
    writeFileSync(
      join(projectDir, 'nodes/http_request.yaml'),
      'id: http_request\nname: HTTP Request\ntype: n8n-nodes-base.httpRequest\nparams: {}\ncredentials: {}\nui:\n  column: 2\n  row: 0\n'
    )
    writeFileSync(join(projectDir, 'edges/main.yaml'), 'connections: []\n')

    const patch: PatchFile = {
      version: '0.1.0',
      targetProject: 'test',
      summary: 'Insert node and connect edge',
      operations: [
        {
          type: 'create_file',
          path: 'nodes/inserted-node.yaml',
          payload: {
            id: 'inserted_node',
            name: 'Inserted Node',
            type: 'n8n-nodes-base.manualTrigger',
            params: {},
            credentials: {},
            ui: {
              column: 1,
              row: 1
            }
          },
          reason: 'Create inserted node'
        },
        {
          type: 'update_fields',
          path: 'edges/main.yaml',
          updates: {
            'connections.0': { from: 'inserted_node', to: 'http_request' }
          },
          reason: 'Add new edge connection'
        }
      ]
    }

    const result = applyPatch(projectDir, patch)
    expect(result.diagnostics).toHaveLength(0)
    expect(existsSync(join(projectDir, 'nodes/inserted-node.yaml'))).toBe(true)
    const edgeDoc: any = yaml.load(readFileSync(join(projectDir, 'edges/main.yaml'), 'utf-8'))
    expect(edgeDoc.connections[0].from).toBe('inserted_node')
    expect(edgeDoc.connections[0].to).toBe('http_request')
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('deletes a node and updates edges', () => {
    const projectDir = createProjectDir()
    writeFlow(projectDir)
    writeFileSync(
      join(projectDir, 'nodes/old-node.yaml'),
      'id: old_node\nname: Old Node\ntype: n8n-nodes-base.manualTrigger\nparams: {}\ncredentials: {}\nui:\n  column: 0\n  row: 0\n'
    )
    writeFileSync(
      join(projectDir, 'nodes/other-node.yaml'),
      'id: other_node\nname: Other Node\ntype: n8n-nodes-base.manualTrigger\nparams: {}\ncredentials: {}\nui:\n  column: 1\n  row: 0\n'
    )
    writeFileSync(join(projectDir, 'edges/main.yaml'), 'connections:\n  - from: old_node\n    to: other_node\n')

    const patch: PatchFile = {
      version: '0.1.0',
      targetProject: 'test',
      summary: 'Delete old node and prune edge',
      operations: [
        {
          type: 'delete_file',
          path: 'nodes/old-node.yaml',
          reason: 'Remove old node'
        },
        {
          type: 'update_fields',
          path: 'edges/main.yaml',
          updates: {
            connections: []
          },
          reason: 'Remove stale edge'
        }
      ]
    }

    const result = applyPatch(projectDir, patch)
    expect(result.diagnostics).toHaveLength(0)
    expect(existsSync(join(projectDir, 'nodes/old-node.yaml'))).toBe(false)
    const edgeDoc: any = yaml.load(readFileSync(join(projectDir, 'edges/main.yaml'), 'utf-8'))
    expect(edgeDoc.connections).toEqual([])
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('rejects node.id mutation', () => {
    const projectDir = createProjectDir()
    writeFlow(projectDir)
    writeFileSync(
      join(projectDir, 'nodes/http-request.yaml'),
      'id: http_request\nname: HTTP Request\ntype: n8n-nodes-base.httpRequest\nparams: {}\ncredentials: {}\nui:\n  column: 1\n  row: 0\n'
    )

    const patch: PatchFile = {
      version: '0.1.0',
      targetProject: 'test',
      summary: 'Reject node id mutation',
      operations: [
        {
          type: 'update_fields',
          path: 'nodes/http-request.yaml',
          updates: {
            id: 'new_id'
          },
          reason: 'Attempt to mutate node id'
        }
      ]
    }

    const result = applyPatch(projectDir, patch)
    expect(result.diagnostics.some(d => d.message.includes('Immutable identifier mutation'))).toBe(true)
    const content = readFileSync(join(projectDir, 'nodes/http-request.yaml'), 'utf-8')
    const doc: any = yaml.load(content)
    expect(doc.id).toBe('http_request')
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('rejects invalid final graph and does not persist changes', () => {
    const projectDir = createProjectDir()
    writeFlow(projectDir)
    writeFileSync(
      join(projectDir, 'nodes/node-a.yaml'),
      'id: node_a\nname: Node A\ntype: n8n-nodes-base.manualTrigger\nparams: {}\ncredentials: {}\nui:\n  column: 0\n  row: 0\n'
    )
    writeFileSync(
      join(projectDir, 'nodes/node-b.yaml'),
      'id: node_b\nname: Node B\ntype: n8n-nodes-base.manualTrigger\nparams: {}\ncredentials: {}\nui:\n  column: 1\n  row: 0\n'
    )
    writeFileSync(join(projectDir, 'edges/main.yaml'), 'connections:\n  - from: node_a\n    to: node_b\n')

    const patch: PatchFile = {
      version: '0.1.0',
      targetProject: 'test',
      summary: 'Delete node B leaving invalid edge',
      operations: [
        {
          type: 'delete_file',
          path: 'nodes/node-b.yaml',
          reason: 'Delete node B'
        }
      ]
    }

    const result = applyPatch(projectDir, patch)
    expect(result.diagnostics.some(d => d.message.includes('Edge to missing node'))).toBe(true)
    expect(existsSync(join(projectDir, 'nodes/node-b.yaml'))).toBe(true)
    rmSync(projectDir, { recursive: true, force: true })
  })
})
