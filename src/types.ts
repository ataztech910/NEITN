export interface Flow {
  id: string
  name: string
  entry: string
  settings: Record<string, any>
}

export interface Node {
  id: string
  name: string
  type: string
  params: Record<string, any>
  credentials: Record<string, any>
  ui: {
    column: number
    row: number
  }
  contract?: {
    input?: {
      fields?: Record<string, string>
    }
    output?: {
      fields?: Record<string, string>
    }
  }
}

export interface Edge {
  from: string
  to: string
  branch?: 'main' | 'true' | 'false' | 'error'
}

export interface Project {
  flow: Flow
  nodes: Node[]
  edges: Edge[]
}

export interface Diagnostic {
  message: string
  file?: string
  line?: number
}

export interface AppliedPatch {
  id: string
  file: string
  sha256: string
  appliedAt: string
}

export interface AppliedPatchesState {
  version: number
  applied: AppliedPatch[]
}