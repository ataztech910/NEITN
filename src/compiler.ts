import { Project } from './types'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface N8nWorkflow {
  name: string
  nodes: N8nNode[]
  connections: Record<string, N8nConnections>
  active: boolean
  settings: Record<string, any>
  [key: string]: any
}

export interface N8nNode {
  parameters: Record<string, any>
  name: string
  type: string
  typeVersion: number
  position: [number, number]
  id: string
  credentials?: Record<string, any>
  [key: string]: any
}

export interface N8nConnections {
  main: N8nConnection[][]
}

export interface N8nConnection {
  node: string
  type: string
  index: number
}

export function compileProject(project: Project, projectDir = process.cwd()): N8nWorkflow {
  const nodeNameById = Object.fromEntries(project.nodes.map(node => [node.id, node.name]))
  const nodes: N8nNode[] = project.nodes.map(node => {
    const params = { ...node.params }
    const protectedExtraKeys = new Set([
      'id',
      'name',
      'type',
      'typeVersion',
      'parameters',
      'position',
      'credentials'
    ])

    if (params.jsCodeFrom) {
      const codeFile = params.jsCodeFrom
      const compiledFile = codeFile
        .replace(/^code\//, 'dist/code/')
        .replace(/\.(ts|js)$/, '.js')

      const fullPath = join(projectDir, compiledFile)
      if (!existsSync(fullPath)) {
        throw new Error(`Compiled code file not found: ${fullPath}. Run 'neitn code:build' first.`)
      }

      const jsCode = readFileSync(fullPath, 'utf-8')
      if (!jsCode.trim()) {
        throw new Error(`Empty compiled code file: ${fullPath}`)
      }

      params.jsCode = jsCode
      delete params.jsCodeFrom
    }

    if (node.extra) {
      for (const key of Object.keys(node.extra)) {
        if (protectedExtraKeys.has(key)) {
          throw new Error(`Node ${node.id}: extra must not override protected field: ${key}`)
        }
      }
    }

    const positionX = typeof node.ui.x === 'number'
      ? node.ui.x
      : (node.ui.column ?? 0) * 300
    const positionY = typeof node.ui.y === 'number'
      ? node.ui.y
      : (node.ui.row ?? 0) * 200

    const compiledNode: N8nNode = {
      parameters: params,
      name: node.name,
      type: node.type,
      typeVersion: node.typeVersion ?? 1,
      position: [positionX, positionY],
      id: node.id
    }

    if (node.credentials) {
      compiledNode.credentials = Object.fromEntries(
        Object.entries(node.credentials).map(([name, reference]) => {
          if (typeof reference === 'string') {
            return [name, { name: reference }]
          }

          return [name, reference]
        })
      )
    }

    if (node.extra) {
      Object.assign(compiledNode, node.extra)
    }

    return compiledNode
  })

  const connections: Record<string, N8nConnections> = {}

  for (const edge of project.edges) {
    const from = edge.from
    const to = edge.to
    const branch = edge.branch
    const branchIndex = branch === 'false' || branch === 'error' ? 1 : 0
    const fromName = nodeNameById[from] ?? from
    const toName = nodeNameById[to] ?? to

    if (!connections[fromName]) {
      connections[fromName] = { main: [] }
    }

    while (connections[fromName].main.length <= branchIndex) {
      connections[fromName].main.push([])
    }

    connections[fromName].main[branchIndex].push({
      node: toName,
      type: 'main',
      index: 0
    })
  }

  const compiledWorkflow: N8nWorkflow = {
    name: project.flow.name,
    nodes,
    connections,
    active: false,
    settings: project.flow.settings
  }

  if (project.flow.extra) {
    Object.assign(compiledWorkflow, project.flow.extra)
  }

  return compiledWorkflow
}
