import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import * as yaml from 'js-yaml'
import { Flow, Node, Edge, Project, Diagnostic } from './types'

export function loadProject(projectDir: string): { project?: Project; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []

  // Load flow.yaml
  const flowPath = join(projectDir, 'flow.yaml')
  if (!existsSync(flowPath)) {
    diagnostics.push({ message: 'Missing flow.yaml' })
    return { diagnostics }
  }

  let flow: Flow
  try {
    const flowContent = readFileSync(flowPath, 'utf-8')
    flow = yaml.load(flowContent) as Flow
  } catch (error) {
    diagnostics.push({ message: `Failed to parse flow.yaml: ${error.message}`, file: 'flow.yaml' })
    return { diagnostics }
  }

  // Load nodes
  const nodesDir = join(projectDir, 'nodes')
  const nodes: Node[] = []
  if (existsSync(nodesDir)) {
    const nodeFiles = readdirSync(nodesDir).filter(f => f.endsWith('.yaml'))
    for (const file of nodeFiles) {
      try {
        const content = readFileSync(join(nodesDir, file), 'utf-8')
        const node = yaml.load(content) as Node
        nodes.push(node)
      } catch (error) {
        diagnostics.push({ message: `Failed to parse ${file}: ${error.message}`, file: `nodes/${file}` })
      }
    }
  }

  // Load edges
  const edgesDir = join(projectDir, 'edges')
  const edges: Edge[] = []
  if (existsSync(edgesDir)) {
    const edgeFiles = readdirSync(edgesDir).filter(f => f.endsWith('.yaml'))
    for (const file of edgeFiles) {
      try {
        const content = readFileSync(join(edgesDir, file), 'utf-8')
        const raw = yaml.load(content)

        if (raw == null) {
          continue
        }

        if (Array.isArray(raw)) {
          for (const item of raw) {
            if (item && typeof item === 'object' && typeof item.from === 'string' && typeof item.to === 'string') {
              edges.push({ from: item.from, to: item.to })
            } else {
              diagnostics.push({ message: 'EDGE_INVALID_SHAPE', file: `edges/${file}` })
            }
          }

          continue
        }

        if (typeof raw === 'object') {
          if ('connections' in raw) {
            if (!Array.isArray(raw.connections)) {
              diagnostics.push({ message: 'EDGE_INVALID_SHAPE', file: `edges/${file}` })
              continue
            }

            let invalidShape = false
            for (const item of raw.connections) {
              if (!item || typeof item !== 'object') {
                invalidShape = true
                break
              }

              const from = (item as any).from
              const to = (item as any).to
              const branch = (item as any).branch

              const branchValid =
                branch === undefined ||
                branch === 'main' ||
                branch === 'true' ||
                branch === 'false' ||
                branch === 'error'

              if (typeof from !== 'string' || typeof to !== 'string' || !branchValid) {
                invalidShape = true
                break
              }

              edges.push({ from, to, branch })
            }

            if (invalidShape) {
              diagnostics.push({ message: 'EDGE_INVALID_SHAPE', file: `edges/${file}` })
            }
            continue
          }

          if (typeof raw.from === 'string' && typeof raw.to === 'string') {
            edges.push({ from: raw.from, to: raw.to })
            continue
          }
        }

        diagnostics.push({ message: 'EDGE_INVALID_SHAPE', file: `edges/${file}` })
      } catch (error) {
        diagnostics.push({ message: `Failed to parse ${file}: ${error.message}`, file: `edges/${file}` })
      }
    }
  }

  const project: Project = { flow, nodes, edges }
  return { project, diagnostics }
}