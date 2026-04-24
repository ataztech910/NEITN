import { Project, Diagnostic } from './types'
import { existsSync } from 'fs'
import { join } from 'path'

export function validateProject(project: Project): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  // Duplicate node ids
  const nodeIds = new Set<string>()
  for (const node of project.nodes) {
    if (nodeIds.has(node.id)) {
      diagnostics.push({ message: `Duplicate node id: ${node.id}` })
    } else {
      nodeIds.add(node.id)
    }
  }

  // Missing entry node
  if (project.flow.entry && !nodeIds.has(project.flow.entry)) {
    diagnostics.push({ message: `Missing entry node: ${project.flow.entry}` })
  }

  // Edge references to missing nodes
  for (const edge of project.edges) {
    if (!nodeIds.has(edge.from)) {
      diagnostics.push({ message: `Edge from missing node: ${edge.from}` })
    }
    if (!nodeIds.has(edge.to)) {
      diagnostics.push({ message: `Edge to missing node: ${edge.to}` })
    }
  }

  // Duplicate identical edges
  const edgeSet = new Set<string>()
  for (const edge of project.edges) {
    const key = `${edge.from}-${edge.to}`
    if (edgeSet.has(key)) {
      diagnostics.push({ message: `Duplicate edge: ${edge.from} -> ${edge.to}` })
    } else {
      edgeSet.add(key)
    }
  }

  // Self-loop edges
  for (const edge of project.edges) {
    if (edge.from === edge.to) {
      diagnostics.push({ message: `Self-loop edge: ${edge.from} -> ${edge.to}` })
    }
  }

  // jsCodeFrom validation
  for (const node of project.nodes) {
    const params = node.params
    if (params.jsCode && params.jsCodeFrom) {
      diagnostics.push({ message: `Node ${node.id}: cannot have both jsCode and jsCodeFrom` })
    }
    if (params.jsCodeFrom) {
      const codeFile = params.jsCodeFrom
      if (!codeFile.startsWith('code/') || !codeFile.endsWith('.ts')) {
        diagnostics.push({ message: `Node ${node.id}: jsCodeFrom must be in code/ directory and end with .ts` })
      } else {
        const projectDir = process.cwd()
        const fullPath = join(projectDir, codeFile)
        if (!existsSync(fullPath)) {
          diagnostics.push({ message: `Node ${node.id}: jsCodeFrom file not found: ${codeFile}` })
        }
      }
    }
  }

  return diagnostics
}