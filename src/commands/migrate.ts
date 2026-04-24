import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import { createHash } from 'crypto'
import { readdirSync } from 'fs'
import { loadPatchFile, applyPatch } from '../patch'
import { validateProject } from '../validator'
import { AppliedPatchesState, AppliedPatch, Diagnostic } from '../types'

function loadAppliedPatchesState(projectDir: string): AppliedPatchesState {
  const stateFile = join(projectDir, '.workflow', 'state', 'applied-patches.json')
  if (!existsSync(stateFile)) {
    return { version: 1, applied: [] }
  }
  try {
    const content = readFileSync(stateFile, 'utf-8')
    return JSON.parse(content) as AppliedPatchesState
  } catch (error) {
    throw new Error(`Failed to load applied patches state: ${error.message}`)
  }
}

function saveAppliedPatchesState(projectDir: string, state: AppliedPatchesState): void {
  const stateDir = join(projectDir, '.workflow', 'state')
  mkdirSync(stateDir, { recursive: true })
  const stateFile = join(stateDir, 'applied-patches.json')
  writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8')
}

function computeSha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function resolvePatchId(patch: any, filename: string): string {
  if (typeof patch.id === 'string') {
    return patch.id
  }
  return basename(filename, '.patch.json')
}

function findPatchFiles(projectDir: string): string[] {
  const patchesDir = join(projectDir, '.workflow', 'patches')
  if (!existsSync(patchesDir)) {
    return []
  }
  const patchFiles = readdirSync(patchesDir)
    .filter(f => f.endsWith('.patch.json'))
    .sort() // lexicographic order
    .map(f => join(patchesDir, f))
  return patchFiles
}

export function migrate(projectDir: string): { diagnostics: Diagnostic[]; applied: number; skipped: number } {
  const diagnostics: Diagnostic[] = []
  let appliedCount = 0
  let skippedCount = 0

  try {
    const state = loadAppliedPatchesState(projectDir)
    const patchFiles = findPatchFiles(projectDir)

    for (const filePath of patchFiles) {
      const content = readFileSync(filePath, 'utf-8')
      const sha256 = computeSha256(content)
      const { patch, diagnostics: loadDiagnostics } = loadPatchFile(filePath)
      if (loadDiagnostics.length > 0) {
        diagnostics.push(...loadDiagnostics)
        break // stop on first failure
      }
      if (!patch) {
        diagnostics.push({ message: `Failed to load patch: ${filePath}` })
        break
      }

      const id = resolvePatchId(patch, basename(filePath))
      const alreadyApplied = state.applied.find(a => a.id === id)
      if (alreadyApplied) {
        if (alreadyApplied.sha256 !== sha256) {
          diagnostics.push({ message: `Patch ${id} was already applied with a different hash. Historical patch files must not be modified.` })
          break
        }
        skippedCount++
        continue
      }

      const applyResult = applyPatch(projectDir, patch)
      if (applyResult.diagnostics.length > 0) {
        diagnostics.push(...applyResult.diagnostics)
        break // stop on first failure
      }

      // record as applied
      state.applied.push({
        id,
        file: filePath,
        sha256,
        appliedAt: new Date().toISOString()
      })
      saveAppliedPatchesState(projectDir, state)
      appliedCount++
    }

    // Note: skippedCount is counted in the loop

  } catch (error) {
    diagnostics.push({ message: error.message })
  }

  return { diagnostics, applied: appliedCount, skipped: skippedCount }
}