import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'

interface ImportOptions {
  overwrite?: boolean
  extractCode?: boolean
}

interface N8nWorkflowNode {
  id?: string
  name: string
  type: string
  typeVersion?: number
  position?: [number, number]
  parameters?: Record<string, any>
  credentials?: Record<string, any>
  [key: string]: any
}

interface N8nWorkflow {
  name: string
  nodes: N8nWorkflowNode[]
  connections?: Record<string, Record<string, Array<Array<{ node: string; type?: string; index?: number }>>>>
  settings?: Record<string, any>
  pinData?: Record<string, any>
  versionId?: string
  meta?: Record<string, any>
  tags?: Array<any>
}

const KNOWN_NODE_FIELDS = new Set([
  'id',
  'name',
  'type',
  'typeVersion',
  'position',
  'parameters',
  'credentials'
])

function toSnakeCase(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  return normalized || 'node'
}

function ensureUniqueId(baseId: string, usedIds: Set<string>): string {
  let nextId = baseId
  let suffix = 2
  while (usedIds.has(nextId)) {
    nextId = `${baseId}_${suffix}`
    suffix += 1
  }
  usedIds.add(nextId)
  return nextId
}

function mapCredentials(credentials?: Record<string, any>): Record<string, string> | undefined {
  if (!credentials || typeof credentials !== 'object') {
    return undefined
  }

  const mapped = Object.fromEntries(
    Object.entries(credentials)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return [key, value]
        }

        if (value && typeof value === 'object') {
          if (typeof value.name === 'string' && value.name.trim()) {
            return [key, value.name]
          }
          if (typeof value.id === 'string' && value.id.trim()) {
            return [key, value.id]
          }
        }

        return null
      })
      .filter((entry): entry is [string, string] => entry !== null)
  )

  return Object.keys(mapped).length > 0 ? mapped : undefined
}

function inferEntry(nodeIds: string[], incomingCounts: Record<string, number>, nodeTypes: Record<string, string>): string {
  const rootIds = nodeIds.filter(nodeId => !incomingCounts[nodeId])
  const preferred = rootIds.find(nodeId => {
    const type = nodeTypes[nodeId] ?? ''
    return type === 'n8n-nodes-base.webhook' || type === 'n8n-nodes-base.manualTrigger'
  })

  if (preferred) {
    return preferred
  }

  return rootIds[0] ?? nodeIds[0] ?? ''
}

function collectEdges(
  workflow: N8nWorkflow,
  nodeIdByName: Record<string, string>,
  nodeTypeById: Record<string, string>
) {
  const edges: Array<{ from: string; to: string; branch?: 'main' | 'true' | 'false' }> = []
  const incomingCounts: Record<string, number> = {}

  for (const [fromName, connectionTypes] of Object.entries(workflow.connections ?? {})) {
    const fromId = nodeIdByName[fromName]
    if (!fromId) {
      continue
    }

    const mainOutputs = connectionTypes.main ?? []
    for (let outputIndex = 0; outputIndex < mainOutputs.length; outputIndex += 1) {
      const outputGroup = mainOutputs[outputIndex] ?? []
      for (const connection of outputGroup) {
        const toId = nodeIdByName[connection.node]
        if (!toId) {
          continue
        }

        let branch: 'main' | 'true' | 'false' | undefined
        if (nodeTypeById[fromId] === 'n8n-nodes-base.if') {
          branch = outputIndex === 0 ? 'true' : outputIndex === 1 ? 'false' : 'main'
        } else if (outputIndex > 0) {
          branch = outputIndex === 1 ? 'false' : 'main'
        }

        edges.push(branch ? { from: fromId, to: toId, branch } : { from: fromId, to: toId })
        incomingCounts[toId] = (incomingCounts[toId] ?? 0) + 1
      }
    }
  }

  return { edges, incomingCounts }
}

function dumpYaml(value: unknown): string {
  return yaml.dump(value, { noRefs: true, lineWidth: -1 })
}

function clearImportedProjectFiles(projectDir: string) {
  const nodesDir = join(projectDir, 'nodes')
  const edgesDir = join(projectDir, 'edges')
  const codeDir = join(projectDir, 'code')

  if (existsSync(join(projectDir, 'flow.yaml'))) {
    rmSync(join(projectDir, 'flow.yaml'))
  }

  if (existsSync(nodesDir)) {
    for (const file of readdirSync(nodesDir)) {
      if (file.endsWith('.yaml')) {
        rmSync(join(nodesDir, file))
      }
    }
  }

  if (existsSync(edgesDir)) {
    for (const file of readdirSync(edgesDir)) {
      if (file.endsWith('.yaml')) {
        rmSync(join(edgesDir, file))
      }
    }
  }

  if (existsSync(codeDir)) {
    for (const file of readdirSync(codeDir)) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        rmSync(join(codeDir, file))
      }
    }
  }
}

export function importWorkflow(workflowPath: string, projectDir: string, options: ImportOptions = {}) {
  let workflow: N8nWorkflow

  try {
    workflow = JSON.parse(readFileSync(workflowPath, 'utf-8')) as N8nWorkflow
  } catch (error) {
    throw new Error(`Failed to parse workflow JSON: ${error.message}`)
  }

  if (!workflow || typeof workflow !== 'object' || !Array.isArray(workflow.nodes)) {
    throw new Error('Invalid n8n workflow JSON')
  }

  const usedIds = new Set<string>()
  const nodeIdByName: Record<string, string> = {}
  const nodeTypeById: Record<string, string> = {}
  const nodeFiles: Array<{ path: string; content: string }> = []
  const codeFiles: Array<{ path: string; content: string }> = []

  for (const node of workflow.nodes) {
    const nodeId = ensureUniqueId(toSnakeCase(node.name), usedIds)
    nodeIdByName[node.name] = nodeId
    nodeTypeById[nodeId] = node.type

    const params = { ...(node.parameters ?? {}) }
    if (options.extractCode !== false && node.type === 'n8n-nodes-base.code' && typeof params.jsCode === 'string') {
      codeFiles.push({
        path: join('code', `${nodeId}.ts`),
        content: params.jsCode.endsWith('\n') ? params.jsCode : `${params.jsCode}\n`
      })
      delete params.jsCode
      params.jsCodeFrom = `code/${nodeId}.ts`
    }

    const credentials = mapCredentials(node.credentials)
    const extra = Object.fromEntries(
      Object.entries(node).filter(([key]) => !KNOWN_NODE_FIELDS.has(key))
    )

    const nodeDoc: Record<string, any> = {
      id: nodeId,
      name: node.name,
      type: node.type,
      params,
      ui: {
        x: Array.isArray(node.position) ? node.position[0] : 0,
        y: Array.isArray(node.position) ? node.position[1] : 0
      }
    }

    if (typeof node.typeVersion === 'number') {
      nodeDoc.typeVersion = node.typeVersion
    }
    if (credentials) {
      nodeDoc.credentials = credentials
    }
    if (Object.keys(extra).length > 0) {
      nodeDoc.extra = extra
    }

    nodeFiles.push({
      path: join('nodes', `${nodeId}.yaml`),
      content: dumpYaml(nodeDoc)
    })
  }

  const { edges, incomingCounts } = collectEdges(workflow, nodeIdByName, nodeTypeById)
  const nodeIds = nodeFiles.map(file => {
    const basename = file.path.split('/').pop() ?? ''
    return basename.replace(/\.yaml$/, '')
  })
  const entry = inferEntry(nodeIds, incomingCounts, nodeTypeById)
  const flowExtra = Object.fromEntries(
    Object.entries({
      pinData: workflow.pinData,
      versionId: workflow.versionId,
      meta: workflow.meta,
      tags: workflow.tags
    }).filter(([, value]) => value !== undefined)
  )

  const flow: Record<string, any> = {
    id: toSnakeCase(workflow.name || 'workflow'),
    name: workflow.name || 'Imported Workflow',
    entry,
    settings: workflow.settings ?? {}
  }

  if (Object.keys(flowExtra).length > 0) {
    flow.extra = flowExtra
  }

  const filesToWrite = [
    { path: 'flow.yaml', content: dumpYaml(flow) },
    { path: join('edges', 'main.yaml'), content: dumpYaml({ connections: edges }) },
    ...nodeFiles,
    ...codeFiles
  ]

  if (!options.overwrite) {
    const existing = filesToWrite.find(file => existsSync(join(projectDir, file.path)))
    if (existing) {
      throw new Error(`Target file already exists: ${existing.path}. Use --overwrite to replace imported files.`)
    }
  } else {
    clearImportedProjectFiles(projectDir)
  }

  mkdirSync(join(projectDir, 'nodes'), { recursive: true })
  mkdirSync(join(projectDir, 'edges'), { recursive: true })
  if (codeFiles.length > 0) {
    mkdirSync(join(projectDir, 'code'), { recursive: true })
  }

  for (const file of filesToWrite) {
    writeFileSync(join(projectDir, file.path), file.content)
  }

  console.log(`Imported workflow into ${projectDir}`)
}
