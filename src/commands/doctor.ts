import { loadProject } from '../loader'
import { Node, Project } from '../types'

function collectJsonFields(value: any, fields: Set<string>): void {
  if (typeof value === 'string') {
    const regex = /\$json\.([a-zA-Z_][a-zA-Z0-9_]*)/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(value)) !== null) {
      fields.add(match[1])
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonFields(item, fields)
    }
    return
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectJsonFields(nested, fields)
    }
  }
}

function buildParentMap(project: Project): Record<string, string[]> {
  const parents: Record<string, string[]> = {}
  for (const node of project.nodes) {
    parents[node.id] = []
  }

  for (const edge of project.edges) {
    if (!parents[edge.to]) {
      parents[edge.to] = []
    }
    parents[edge.to].push(edge.from)
  }

  return parents
}

function computeUpstreamFields(project: Project): Record<string, Set<string>> {
  const parentMap = buildParentMap(project)
  const outputFieldsByNode: Record<string, Set<string>> = {}
  const upstreamFields: Record<string, Set<string>> = {}

  for (const node of project.nodes) {
    const outputFields = new Set<string>()
    const output = node.contract?.output?.fields
    if (output) {
      for (const field of Object.keys(output)) {
        outputFields.add(field)
      }
    }
    outputFieldsByNode[node.id] = outputFields
    upstreamFields[node.id] = new Set<string>()
  }

  let changed = true
  while (changed) {
    changed = false

    for (const node of project.nodes) {
      const parents = parentMap[node.id] ?? []
      const nextSet = new Set<string>()

      for (const parentId of parents) {
        for (const field of outputFieldsByNode[parentId]) {
          nextSet.add(field)
        }
        for (const field of upstreamFields[parentId]) {
          nextSet.add(field)
        }
      }

      for (const field of nextSet) {
        if (!upstreamFields[node.id].has(field)) {
          upstreamFields[node.id].add(field)
          changed = true
        }
      }
    }
  }

  return upstreamFields
}

function isIfNode(node: Node): boolean {
  return typeof node.type === 'string' && (node.type === 'n8n-nodes-base.if' || node.type.endsWith('.if'))
}

export function doctor(projectDir: string): string[] {
  const warnings: string[] = []
  const { project, diagnostics: loadDiagnostics } = loadProject(projectDir)

  if (!project) {
    return loadDiagnostics.map(d => `ERROR: ${d.message}`)
  }

  const upstreamFields = computeUpstreamFields(project)

  for (const node of project.nodes) {
    const nodeId = typeof node.id === 'string' ? node.id : '<unknown>'

    if (typeof node.type !== 'string') {
      warnings.push(`WARN: NODE_MISSING_TYPE for node ${nodeId}`)
    }

    if (!node.contract) {
      warnings.push(`INFO: Node ${nodeId} has no contract defined`)
    }

    const expressionFields = new Set<string>()
    collectJsonFields(node.params, expressionFields)

    const missingExpressionFields = new Set<string>()
    for (const field of expressionFields) {
      if (!upstreamFields[node.id]?.has(field)) {
        missingExpressionFields.add(field)
      }
    }

    const missingInputFields = new Set<string>()
    const inputFields = node.contract?.input?.fields
    if (inputFields) {
      for (const field of Object.keys(inputFields)) {
        if (!upstreamFields[node.id]?.has(field)) {
          missingInputFields.add(field)
        }
      }
    }

    const allMissingFields = new Set<string>([
      ...missingExpressionFields,
      ...missingInputFields
    ])

    for (const field of allMissingFields) {
      const missingExpression = missingExpressionFields.has(field)
      const missingInput = missingInputFields.has(field)

      if (missingExpression && missingInput) {
        warnings.push(`WARN: Node ${nodeId} requires field '${field}', but upstream does not provide it`)
      } else if (missingExpression) {
        if (isIfNode(node)) {
          warnings.push(`WARN: IF node ${nodeId} checks '${field}' but upstream does not define it`)
        } else {
          warnings.push(`WARN: Node ${nodeId} uses field '${field}' not declared in upstream contract`)
        }
      } else if (missingInput) {
        warnings.push(`WARN: Node ${nodeId} expects '${field}' but upstream does not provide it`)
      }
    }
  }

  return warnings
}
