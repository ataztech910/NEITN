import { readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import * as yaml from 'js-yaml'
import { Project, Diagnostic, Node, Edge, Flow } from './types'
import { validateProject } from './validator'

export type PatchOperation =
  | AssertExistsOp
  | AssertNotExistsOp
  | CreateFileOp
  | UpdateFieldsOp
  | DeleteFileOp
  | RenameFileOp

export interface PatchFile {
  version: string
  targetProject: string
  summary: string
  operations: PatchOperation[]
  id?: string
}

interface BaseOp {
  type: string
  reason: string
}

export interface AssertExistsOp extends BaseOp {
  type: 'assert_exists'
  path: string
}

export interface AssertNotExistsOp extends BaseOp {
  type: 'assert_not_exists'
  path: string
}

export interface CreateFileOp extends BaseOp {
  type: 'create_file'
  path: string
  payload: Record<string, any>
}

export interface UpdateFieldsOp extends BaseOp {
  type: 'update_fields'
  path: string
  updates: Record<string, any>
}

export interface DeleteFileOp extends BaseOp {
  type: 'delete_file'
  path: string
}

export interface RenameFileOp extends BaseOp {
  type: 'rename_file'
  path: string
  newPath: string
}

export function loadPatchFile(patchPath: string): { patch?: PatchFile; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []

  if (!existsSync(patchPath)) {
    diagnostics.push({ message: `Patch file not found: ${patchPath}` })
    return { diagnostics }
  }

  let raw: any
  try {
    const content = readFileSync(patchPath, 'utf-8')
    raw = JSON.parse(content)
  } catch (error) {
    diagnostics.push({ message: `Failed to parse patch JSON: ${error.message}`, file: patchPath })
    return { diagnostics }
  }

  if (!raw || typeof raw !== 'object') {
    diagnostics.push({ message: 'Invalid patch structure' })
    return { diagnostics }
  }

  const versionValue = raw.version
  if (typeof versionValue !== 'string' && typeof versionValue !== 'number') {
    diagnostics.push({ message: 'Patch missing string field: version' })
  }
  if (typeof raw.targetProject !== 'string') {
    diagnostics.push({ message: 'Patch missing string field: targetProject' })
  }
  if (typeof raw.summary !== 'string') {
    diagnostics.push({ message: 'Patch missing string field: summary' })
  }

  if (!Array.isArray(raw.operations)) {
    diagnostics.push({ message: 'Patch operations must be an array' })
    return { diagnostics }
  }

  const operations: PatchOperation[] = []
  for (const operation of raw.operations) {
    if (!operation || typeof operation !== 'object') {
      diagnostics.push({ message: 'Invalid patch operation' })
      continue
    }

    const type = typeof operation.type === 'string' ? operation.type : typeof operation.op === 'string' ? operation.op : undefined
    const path = typeof operation.path === 'string' ? operation.path : typeof operation.target === 'string' ? operation.target : undefined
    const reason = typeof operation.reason === 'string' ? operation.reason : undefined
    const updates = operation.updates ?? operation.changes
    const payload = operation.payload ?? (typeof operation.content === 'object' ? operation.content : undefined)

    if (!type) {
      diagnostics.push({ message: 'Patch operation missing op' })
      continue
    }
    if (!reason) {
      diagnostics.push({ message: 'Patch operation missing reason' })
      continue
    }

    switch (type) {
      case 'assert_exists':
      case 'assert_not_exists':
      case 'delete_file':
        if (!path) {
          diagnostics.push({ message: `Patch ${type} requires target` })
          continue
        }
        operations.push({ type, path, reason } as PatchOperation)
        break
      case 'create_file':
        if (!path || typeof payload !== 'object' || payload == null) {
          diagnostics.push({ message: 'Patch create_file requires target and payload object' })
          continue
        }
        operations.push({ type, path, payload, reason } as PatchOperation)
        break
      case 'update_fields':
        if (!path || typeof updates !== 'object' || updates == null) {
          diagnostics.push({ message: 'Patch update_fields requires target and updates object' })
          continue
        }
        operations.push({ type, path, updates, reason } as PatchOperation)
        break
      case 'rename_file':
        if (!path || typeof operation.newPath !== 'string') {
          diagnostics.push({ message: 'Patch rename_file requires target and newPath' })
          continue
        }
        operations.push({ type, path, newPath: operation.newPath, reason } as PatchOperation)
        break
      default:
        diagnostics.push({ message: `Unsupported patch operation: ${type}` })
    }
  }

  if (diagnostics.length > 0) {
    return { diagnostics }
  }

  return {
    patch: {
      version: String(versionValue),
      targetProject: raw.targetProject,
      summary: raw.summary,
      operations,
      id: typeof raw.id === 'string' ? raw.id : undefined
    },
    diagnostics
  }
}

function isRelativePath(path: string): boolean {
  return !path.startsWith('/') && !path.includes('..')
}

function setDotPath(target: any, path: string, value: any): void {
  const segments = path.split('.')
  let current: any = target

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i]
    const nextSegment = segments[i + 1]
    const nextIsIndex = !Number.isNaN(Number(nextSegment))
    if (Number.isNaN(Number(segment))) {
      if (current[segment] == null) {
        current[segment] = nextIsIndex ? [] : {}
      }
      current = current[segment]
    } else {
      const index = Number(segment)
      if (!Array.isArray(current)) {
        throw new Error(`Path segment ${segment} requires an array`)
      }
      while (current.length <= index) {
        current.push({})
      }
      current = current[index]
    }
  }

  const lastSegment = segments[segments.length - 1]
  if (Number.isNaN(Number(lastSegment))) {
    current[lastSegment] = value
  } else {
    const index = Number(lastSegment)
    if (!Array.isArray(current)) {
      throw new Error(`Path segment ${lastSegment} requires an array`)
    }
    while (current.length <= index) {
      current.push(null)
    }
    current[index] = value
  }
}

function parseFlow(content: string, path: string, diagnostics: Diagnostic[]): Flow | undefined {
  try {
    return yaml.load(content) as Flow
  } catch (error) {
    diagnostics.push({ message: `Failed to parse ${path}: ${error.message}`, file: path })
    return undefined
  }
}

function parseNode(content: string, path: string, diagnostics: Diagnostic[]): Node | undefined {
  try {
    const raw = yaml.load(content)
    if (!raw || typeof raw !== 'object') {
      diagnostics.push({ message: `Invalid node file: ${path}`, file: path })
      return undefined
    }
    return raw as Node
  } catch (error) {
    diagnostics.push({ message: `Failed to parse ${path}: ${error.message}`, file: path })
    return undefined
  }
}

function parseEdge(content: string, path: string, diagnostics: Diagnostic[]): Edge[] {
  try {
    const raw = yaml.load(content)
    if (raw == null) {
      return []
    }
    const edges: Edge[] = []

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item && typeof item === 'object' && typeof (item as any).from === 'string' && typeof (item as any).to === 'string') {
          edges.push({
            from: (item as any).from,
            to: (item as any).to,
            branch: typeof (item as any).branch === 'string' ? (item as any).branch : undefined
          })
        } else {
          diagnostics.push({ message: 'EDGE_INVALID_SHAPE', file: path })
        }
      }
      return edges
    }

    if (typeof raw === 'object' && 'connections' in raw) {
      if (!Array.isArray((raw as any).connections)) {
        diagnostics.push({ message: 'EDGE_INVALID_SHAPE', file: path })
        return []
      }

      let invalidShape = false
      for (const item of (raw as any).connections) {
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
        diagnostics.push({ message: 'EDGE_INVALID_SHAPE', file: path })
      }
      return edges
    }

    diagnostics.push({ message: 'EDGE_INVALID_SHAPE', file: path })
    return []
  } catch (error) {
    diagnostics.push({ message: `Failed to parse ${path}: ${error.message}`, file: path })
    return []
  }
}

function buildProjectFromFileMap(fileMap: Record<string, string>): { project?: Project; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []

  if (!fileMap['flow.yaml']) {
    diagnostics.push({ message: 'Missing flow.yaml' })
    return { diagnostics }
  }

  const flow = parseFlow(fileMap['flow.yaml'], 'flow.yaml', diagnostics)
  if (!flow) {
    return { diagnostics }
  }

  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const path of Object.keys(fileMap)) {
    if (path === 'flow.yaml') continue
    if (path.startsWith('nodes/') && path.endsWith('.yaml')) {
      const node = parseNode(fileMap[path], path, diagnostics)
      if (node) {
        nodes.push(node)
      }
      continue
    }
    if (path.startsWith('edges/') && path.endsWith('.yaml')) {
      const fileEdges = parseEdge(fileMap[path], path, diagnostics)
      edges.push(...fileEdges)
      continue
    }
  }

  if (diagnostics.length > 0) {
    return { diagnostics }
  }

  return { project: { flow, nodes, edges }, diagnostics }
}

function isFlowIdPath(path: string, updatePath: string): boolean {
  return path === 'flow.yaml' && updatePath === 'id'
}

function isNodeIdPath(path: string, updatePath: string): boolean {
  return path.startsWith('nodes/') && updatePath === 'id'
}

export function applyPatch(projectDir: string, patch: PatchFile): { diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []
  const fileMap: Record<string, string> = {}

  function normalizePath(path: string): string {
    return path.replace(/\\/g, '/')
  }

  function pathExists(path: string): boolean {
    return Object.prototype.hasOwnProperty.call(fileMap, path)
  }

  function readProjectFiles() {
    const flowPath = join(projectDir, 'flow.yaml')
    if (existsSync(flowPath)) {
      fileMap['flow.yaml'] = readFileSync(flowPath, 'utf-8')
    }

    const nodesDir = join(projectDir, 'nodes')
    if (existsSync(nodesDir)) {
      for (const name of readdirSync(nodesDir).filter((f: string) => f.endsWith('.yaml'))) {
        const relativePath = normalizePath(`nodes/${name}`)
        fileMap[relativePath] = readFileSync(join(nodesDir, name), 'utf-8')
      }
    }

    const edgesDir = join(projectDir, 'edges')
    if (existsSync(edgesDir)) {
      for (const name of readdirSync(edgesDir).filter((f: string) => f.endsWith('.yaml'))) {
        const relativePath = normalizePath(`edges/${name}`)
        fileMap[relativePath] = readFileSync(join(edgesDir, name), 'utf-8')
      }
    }
  }

  readProjectFiles()

  const changed = new Set<string>()
  const deleted = new Set<string>()

  for (const operation of patch.operations) {
    const path = normalizePath((operation as any).path)
    if (!isRelativePath(path)) {
      diagnostics.push({ message: `Invalid patch path: ${path}`, file: path })
      break
    }

    switch (operation.type) {
      case 'assert_exists': {
        if (!pathExists(path)) {
          diagnostics.push({ message: `assert_exists failed: ${path} does not exist`, file: path })
        }
        break
      }
      case 'assert_not_exists': {
        if (pathExists(path)) {
          diagnostics.push({ message: `assert_not_exists failed: ${path} exists`, file: path })
        }
        break
      }
      case 'create_file': {
        if (pathExists(path)) {
          diagnostics.push({ message: `create_file failed: ${path} already exists`, file: path })
          break
        }

        const payload = (operation as any).payload
        const content = typeof (operation as any).content === 'string' ? (operation as any).content : undefined

        if (payload && typeof payload === 'object') {
          fileMap[path] = yaml.dump(payload, { noRefs: true, sortKeys: false })
        } else if (content != null) {
          fileMap[path] = content
        } else {
          diagnostics.push({ message: `create_file failed: ${path} requires payload or content`, file: path })
          break
        }

        changed.add(path)
        break
      }
      case 'update_fields': {
        if (!pathExists(path)) {
          diagnostics.push({ message: `update_fields failed: ${path} does not exist`, file: path })
          break
        }

        if (isFlowIdPath(path, 'id') || isNodeIdPath(path, 'id')) {
          if ('id' in operation.updates) {
            diagnostics.push({ message: 'Immutable identifier mutation rejected: id cannot be changed', file: path })
            break
          }
        }

        const content = fileMap[path]
        let doc: any
        try {
          doc = yaml.load(content)
        } catch (error) {
          diagnostics.push({ message: `Failed to parse ${path}: ${error.message}`, file: path })
          break
        }

        if (doc == null || typeof doc !== 'object') {
          diagnostics.push({ message: `Invalid YAML object in ${path}`, file: path })
          break
        }

        try {
          for (const [key, value] of Object.entries(operation.updates)) {
            if (isFlowIdPath(path, key) || isNodeIdPath(path, key)) {
              diagnostics.push({ message: 'Immutable identifier mutation rejected: id cannot be changed', file: path })
              throw new Error('immutable id')
            }
            setDotPath(doc, key, value)
          }
        } catch (error) {
          if (error.message !== 'immutable id') {
            diagnostics.push({ message: `Failed to apply updates to ${path}: ${error.message}`, file: path })
          }
          break
        }

        fileMap[path] = yaml.dump(doc, { noRefs: true, sortKeys: false })
        changed.add(path)
        break
      }
      case 'delete_file': {
        if (!pathExists(path)) {
          diagnostics.push({ message: `delete_file failed: ${path} does not exist`, file: path })
          break
        }
        delete fileMap[path]
        deleted.add(path)
        break
      }
      case 'rename_file': {
        const newPath = normalizePath(operation.newPath)
        if (!isRelativePath(newPath)) {
          diagnostics.push({ message: `Invalid patch newPath: ${newPath}`, file: newPath })
          break
        }
        if (!pathExists(path)) {
          diagnostics.push({ message: `rename_file failed: ${path} does not exist`, file: path })
          break
        }
        if (pathExists(newPath)) {
          diagnostics.push({ message: `rename_file failed: ${newPath} already exists`, file: newPath })
          break
        }
        fileMap[newPath] = fileMap[path]
        delete fileMap[path]
        changed.add(newPath)
        deleted.add(path)
        break
      }
      default:
        diagnostics.push({ message: `Unsupported patch operation: ${(operation as any).type}` })
    }

    if (diagnostics.length > 0) {
      break
    }
  }

  if (diagnostics.length > 0) {
    return { diagnostics }
  }

  const result = buildProjectFromFileMap(fileMap)
  if (!result.project) {
    return { diagnostics: result.diagnostics }
  }

  const validationDiagnostics = validateProject(result.project)
  if (validationDiagnostics.length > 0) {
    return { diagnostics: validationDiagnostics }
  }

  for (const deletedPath of deleted) {
    const absolute = join(projectDir, deletedPath)
    if (existsSync(absolute)) {
      unlinkSync(absolute)
    }
  }

  for (const path of changed) {
    const absolute = join(projectDir, path)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, fileMap[path], 'utf-8')
  }

  return { diagnostics }
}
