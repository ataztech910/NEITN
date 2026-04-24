import { join, isAbsolute } from 'path'
import { loadPatchFile, applyPatch } from '../patch'

export function apply(patchFile: string) {
  const patchPath = isAbsolute(patchFile) ? patchFile : join(process.cwd(), patchFile)
  const { patch, diagnostics: loadDiagnostics } = loadPatchFile(patchPath)

  if (!patch) {
    console.error('Patch load failed:')
    for (const diag of loadDiagnostics) {
      console.error(`- ${diag.message}`)
    }
    process.exit(1)
  }

  const result = applyPatch(process.cwd(), patch)
  if (result.diagnostics.length > 0) {
    console.error('Patch apply failed:')
    for (const diag of result.diagnostics) {
      console.error(`- ${diag.message}`)
    }
    process.exit(1)
  }

  console.log(`Patch applied: ${patchPath}`)
}
