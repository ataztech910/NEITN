import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import * as yaml from 'js-yaml'
import { codeScaffold } from '../src/commands/code-scaffold'
import { importWorkflow } from '../src/commands/import'
import { codeBuild } from '../src/commands/code-build'
import { compile } from '../src/commands/compile'

describe('code scaffold and import split', () => {
  it('scaffolds split code files with normalized id and camelCase function', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'wf-scaffold-'))

    codeScaffold(projectDir, 'Assemble Final Response')

    expect(existsSync(join(projectDir, 'code', 'assemble_final_response.ts'))).toBe(true)
    expect(existsSync(join(projectDir, 'code', 'assemble_final_response.runtime.ts'))).toBe(true)
    expect(existsSync(join(projectDir, 'code', '__tests__', 'assemble_final_response.test.ts'))).toBe(true)
    expect(readFileSync(join(projectDir, 'code', 'assemble_final_response.ts'), 'utf-8')).toContain('export function assembleFinalResponse')
    expect(readFileSync(join(projectDir, 'code', 'assemble_final_response.runtime.ts'), 'utf-8')).toContain("const { assembleFinalResponse } = require('./assemble_final_response');")

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('scaffolds node yaml when --node behavior is requested', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'wf-scaffold-'))

    codeScaffold(projectDir, 'assemble-final-response', { node: true })

    const nodeDoc = yaml.load(readFileSync(join(projectDir, 'nodes', 'assemble_final_response.yaml'), 'utf-8')) as any
    expect(nodeDoc.id).toBe('assemble_final_response')
    expect(nodeDoc.type).toBe('n8n-nodes-base.code')
    expect(nodeDoc.typeVersion).toBe(2)
    expect(nodeDoc.params.jsCodeFrom).toBe('code/assemble_final_response.runtime.ts')

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('imports code nodes into split files and compiles runtime wrapper output', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'wf-scaffold-'))
    const workflowPath = join(projectDir, 'workflow.json')
    writeFileSync(workflowPath, JSON.stringify({
      name: 'Code Split Flow',
      nodes: [
        {
          id: '1',
          name: 'Assemble Final Response',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [0, 0],
          parameters: {
            jsCode: 'const data = $input.first().json;\nreturn [{ json: { result: data } }];'
          }
        }
      ],
      connections: {},
      settings: {}
    }, null, 2))

    importWorkflow(workflowPath, projectDir)

    expect(existsSync(join(projectDir, 'code', 'assemble_final_response.ts'))).toBe(true)
    expect(existsSync(join(projectDir, 'code', 'assemble_final_response.runtime.ts'))).toBe(true)
    expect(existsSync(join(projectDir, 'code', '__tests__', 'assemble_final_response.test.ts'))).toBe(true)

    const pureSource = readFileSync(join(projectDir, 'code', 'assemble_final_response.ts'), 'utf-8')
    const runtimeSource = readFileSync(join(projectDir, 'code', 'assemble_final_response.runtime.ts'), 'utf-8')
    const nodeDoc = yaml.load(readFileSync(join(projectDir, 'nodes', 'assemble_final_response.yaml'), 'utf-8')) as any

    expect(pureSource).toContain('export function assembleFinalResponse')
    expect(runtimeSource).toContain('const data = $input.first().json;')
    expect(runtimeSource).toContain('return [{ json: { result: data } }];')
    expect(nodeDoc.params.jsCodeFrom).toBe('code/assemble_final_response.runtime.ts')

    await codeBuild(projectDir)
    expect(existsSync(join(projectDir, 'dist', 'code', 'assemble_final_response.runtime.js'))).toBe(true)

    await compile(projectDir)

    const compiled = JSON.parse(readFileSync(join(projectDir, 'dist', 'code_split_flow.workflow.json'), 'utf-8'))
    expect(compiled.nodes).toHaveLength(1)
    expect(compiled.nodes[0].parameters.jsCode).toContain('$input.first().json')
    expect(compiled.nodes[0].parameters.jsCode).toContain('return [{ json: { result: data } }];')
    expect(compiled.nodes[0].parameters.jsCodeFrom).toBeUndefined()

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('compiled runtime wrapper bundles pure module imports', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'wf-scaffold-'))
    mkdirSync(join(projectDir, 'nodes'))
    mkdirSync(join(projectDir, 'edges'))
    writeFileSync(join(projectDir, 'flow.yaml'), 'id: scaffold_flow\nname: Scaffold Flow\nentry: "assemble_final_response"\nsettings: {}\n')

    codeScaffold(projectDir, 'assemble_final_response', { node: true })

    await codeBuild(projectDir)
    await compile(projectDir)

    const runtimeBuilt = readFileSync(join(projectDir, 'dist', 'code', 'assemble_final_response.runtime.js'), 'utf-8')
    const workflow = JSON.parse(readFileSync(join(projectDir, 'dist', 'scaffold_flow.workflow.json'), 'utf-8'))

    expect(runtimeBuilt).toContain('assembleFinalResponse')
    expect(workflow.nodes[0].parameters.jsCode).toContain('assembleFinalResponse')
    expect(workflow.nodes[0].parameters.jsCodeFrom).toBeUndefined()

    rmSync(projectDir, { recursive: true, force: true })
  })
})
