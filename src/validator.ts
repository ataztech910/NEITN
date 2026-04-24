import { Project, Diagnostic } from './types'
import { existsSync } from 'fs'
import { join } from 'path'

export function validateProject(project: Project, projectDir = process.cwd()): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const protectedExtraKeys = new Set([
    'id',
    'name',
    'type',
    'typeVersion',
    'parameters',
    'position',
    'credentials'
  ])

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
    if (node.typeVersion !== undefined && typeof node.typeVersion !== 'number') {
      diagnostics.push({ message: `Node ${node.id}: typeVersion must be a number` })
    }

    if (node.extra !== undefined) {
      if (typeof node.extra !== 'object' || node.extra === null || Array.isArray(node.extra)) {
        diagnostics.push({ message: `Node ${node.id}: extra must be an object` })
      } else {
        for (const key of Object.keys(node.extra)) {
          if (protectedExtraKeys.has(key)) {
            diagnostics.push({ message: `Node ${node.id}: extra must not override protected field: ${key}` })
          }
        }
      }
    }

    if (node.credentials !== undefined) {
      if (typeof node.credentials !== 'object' || node.credentials === null || Array.isArray(node.credentials)) {
        diagnostics.push({ message: `Node ${node.id}: credentials must be an object` })
      } else {
        for (const [credentialName, reference] of Object.entries(node.credentials)) {
          if (typeof reference === 'string') {
            continue
          }

          if (typeof reference !== 'object' || reference === null || Array.isArray(reference)) {
            diagnostics.push({ message: `Node ${node.id}: credential ${credentialName} must be a string or safe reference object` })
            continue
          }

          const keys = Object.keys(reference)
          const hasOnlySafeKeys = keys.every(key => key === 'id' || key === 'name')
          const valuesAreStrings = keys.every(key => typeof (reference as Record<string, unknown>)[key] === 'string')

          if (!hasOnlySafeKeys || !valuesAreStrings) {
            diagnostics.push({ message: `Node ${node.id}: credential ${credentialName} must be a string or safe reference object` })
          }
        }
      }
    }

    const params = node.params
    if (params.jsCode && params.jsCodeFrom) {
      diagnostics.push({ message: `Node ${node.id}: cannot have both jsCode and jsCodeFrom` })
    }
    if (params.jsCodeFrom) {
      const codeFile = params.jsCodeFrom
      if (!codeFile.startsWith('code/') || !/\.(ts|js)$/.test(codeFile)) {
        diagnostics.push({ message: `Node ${node.id}: jsCodeFrom must be in code/ directory and end with .ts or .js` })
      } else {
        const fullPath = join(projectDir, codeFile)
        if (!existsSync(fullPath)) {
          diagnostics.push({ message: `Node ${node.id}: jsCodeFrom file not found: ${codeFile}` })
        } else if (codeFile.includes('.runtime.')) {
          const pureFile = codeFile.replace('.runtime.', '.')
          const purePath = join(projectDir, pureFile)
          if (!existsSync(purePath)) {
            diagnostics.push({ message: `Node ${node.id}: split code logic file not found: ${pureFile}` })
          }
        }
      }
    }
  }

  return diagnostics
}
