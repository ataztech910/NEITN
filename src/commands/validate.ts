import { loadProject } from '../loader'
import { validateProject } from '../validator'

export function validate(projectDir: string) {
  const { project, diagnostics: loadDiagnostics } = loadProject(projectDir)

  if (!project) {
    console.error('Failed to load project:')
    for (const diag of loadDiagnostics) {
      console.error(`- ${diag.message}`)
    }
    process.exit(1)
  }

  const validationDiagnostics = validateProject(project)

  const allDiagnostics = [...loadDiagnostics, ...validationDiagnostics]

  if (allDiagnostics.length === 0) {
    console.log('Project is valid')
  } else {
    console.error('Validation errors:')
    for (const diag of allDiagnostics) {
      console.error(`- ${diag.message}`)
    }
    process.exit(1)
  }
}