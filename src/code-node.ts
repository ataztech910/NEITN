import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

export function normalizeNodeId(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  return normalized || 'code_node'
}

export function toCamelCase(nodeId: string): string {
  const normalized = normalizeNodeId(nodeId)
  return normalized.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

function toTitleCase(nodeId: string): string {
  return normalizeNodeId(nodeId)
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function createCodeNodeSplitFiles(
  projectDir: string,
  rawNodeId: string,
  options: {
    createNodeYaml?: boolean
    overwrite?: boolean
    runtimeSource?: string
  } = {}
) {
  const files = generateCodeNodeSplitTemplates(rawNodeId, options)
  const nodeId = files.nodeId
  const functionName = files.functionName
  const codeDir = join(projectDir, 'code')
  const testsDir = join(codeDir, '__tests__')
  const purePath = join(codeDir, `${nodeId}.ts`)
  const runtimePath = join(codeDir, `${nodeId}.runtime.ts`)
  const testPath = join(testsDir, `${nodeId}.test.ts`)
  const nodePath = join(projectDir, 'nodes', `${nodeId}.yaml`)

  const targets = [
    purePath,
    runtimePath,
    testPath,
    ...(options.createNodeYaml ? [nodePath] : [])
  ]

  if (!options.overwrite) {
    const existing = targets.find(target => existsSync(target))
    if (existing) {
      throw new Error(`Target file already exists: ${existing}`)
    }
  }

  mkdirSync(codeDir, { recursive: true })
  mkdirSync(testsDir, { recursive: true })
  writeFileSync(purePath, files.pureContent)
  writeFileSync(runtimePath, files.runtimeContent)
  writeFileSync(testPath, files.testContent)

  if (options.createNodeYaml) {
    mkdirSync(join(projectDir, 'nodes'), { recursive: true })
    writeFileSync(nodePath, files.nodeYamlContent)
  }

  return {
    nodeId,
    functionName,
    purePath,
    runtimePath,
    testPath,
    nodePath: options.createNodeYaml ? nodePath : undefined
  }
}

export function generateCodeNodeSplitTemplates(
  rawNodeId: string,
  options: {
    createNodeYaml?: boolean
    runtimeSource?: string
  } = {}
) {
  const nodeId = normalizeNodeId(rawNodeId)
  const functionName = toCamelCase(nodeId)

  const runtimeContent = options.runtimeSource ?? [
    `const { ${functionName} } = require('./${nodeId}');`,
    '',
    'const data = $input.first().json;',
    '',
    `return [{ json: ${functionName}(data) }];`,
    ''
  ].join('\n')

  const pureContent = [
    `export function ${functionName}(data: any) {`,
    '  return data;',
    '}',
    ''
  ].join('\n')

  const testContent = [
    "import { describe, expect, it } from 'vitest';",
    `import { ${functionName} } from '../${nodeId}';`,
    '',
    `describe('${functionName}', () => {`,
    "  it('returns transformed data', () => {",
    '    const input = { ok: true };',
    `    const result = ${functionName}(input);`,
    '',
    '    expect(result).toEqual(input);',
    '  });',
    '});',
    ''
  ].join('\n')

  const nodeYamlContent = [
    `id: ${nodeId}`,
    `name: ${toTitleCase(nodeId)}`,
    'type: n8n-nodes-base.code',
    'typeVersion: 2',
    'params:',
    `  jsCodeFrom: code/${nodeId}.runtime.ts`,
    'ui:',
    '  column: 1',
    '  row: 1',
    ''
  ].join('\n')

  return {
    nodeId,
    functionName,
    pureContent,
    runtimeContent,
    testContent,
    nodeYamlContent
  }
}
