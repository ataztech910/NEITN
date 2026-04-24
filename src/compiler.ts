import { Project } from './types'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'

export interface N8nWorkflow {
  name: string
  nodes: N8nNode[]
  connections: Record<string, N8nConnections>
  active: boolean
  settings: Record<string, any>
}

export interface N8nNode {
  parameters: Record<string, any>
  name: string
  type: string
  typeVersion: number
  position: [number, number]
  id: string
  credentials: Record<string, any>
}

export interface N8nConnections {
  main: N8nConnection[][]
}

export interface N8nConnection {
  node: string
  type: string
  index: number
}

export function compileProject(project: Project): N8nWorkflow {
  const nodes: N8nNode[] = project.nodes.map(node => {
    const params = { ...node.params }

    if (params.jsCodeFrom) {
      const codeFile = params.jsCodeFrom
      const compiledFile = codeFile.replace(/^code\//, 'dist/code/').replace(/\.ts$/, '.js')
      const projectDir = process.cwd() // Assuming compile is run from project dir

      const fullPath = join(projectDir, compiledFile)
      if (!existsSync(fullPath)) {
        throw new Error(`Compiled code file not found: ${fullPath}. Run 'wf code:build' first.`)
      }

      const jsCode = readFileSync(fullPath, 'utf-8')
      if (!jsCode.trim()) {
        throw new Error(`Empty compiled code file: ${fullPath}`)
      }

      params.jsCode = jsCode
      delete params.jsCodeFrom
    }

    return {
      parameters: params,
      name: node.name,
      type: node.type,
      typeVersion: 1,
      position: [node.ui.column * 300, node.ui.row * 200],
      id: node.id,
      credentials: node.credentials
    }
  })

  const connections: Record<string, N8nConnections> = {}

  for (const edge of project.edges) {
    const from = edge.from
    const to = edge.to
    const branch = edge.branch
    const branchIndex = branch === 'false' || branch === 'error' ? 1 : 0

    if (!connections[from]) {
      connections[from] = { main: [] }
    }

    while (connections[from].main.length <= branchIndex) {
      connections[from].main.push([])
    }

    connections[from].main[branchIndex].push({
      node: to,
      type: 'main',
      index: 0
    })
  }

  return {
    name: project.flow.name,
    nodes,
    connections,
    active: false,
    settings: project.flow.settings
  }
}