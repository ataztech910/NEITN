import { loadProject } from '../loader'
import { validateProject } from '../validator'
import { compileProject } from '../compiler'
import { codeBuild } from './code-build'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface CompileOptions {
  noCodeBuild?: boolean
}

export async function compile(projectDir: string, options: CompileOptions = {}) {
  const { project, diagnostics: loadDiagnostics } = loadProject(projectDir)

  if (!project) {
    console.error('Failed to load project:')
    for (const diag of loadDiagnostics) {
      console.error(`- ${diag.message}`)
    }
    process.exit(1)
  }

  const validationDiagnostics = validateProject(project, projectDir)

  const allDiagnostics = [...loadDiagnostics, ...validationDiagnostics]

  if (allDiagnostics.length > 0) {
    console.error('Cannot compile invalid project:')
    for (const diag of allDiagnostics) {
      console.error(`- ${diag.message}`)
    }
    process.exit(1)
  }

  // Check if any node has jsCodeFrom, if so, build code
  const hasJsCodeFrom = project.nodes.some(node => node.params.jsCodeFrom)
  if (hasJsCodeFrom && !options.noCodeBuild) {
    console.log('Building code files...')
    await codeBuild(projectDir)
  }

  const workflow = compileProject(project, projectDir)

  const distDir = join(projectDir, 'dist')
  mkdirSync(distDir, { recursive: true })

  const outputPath = join(distDir, `${project.flow.id}.workflow.json`)
  writeFileSync(outputPath, JSON.stringify(workflow, null, 2))

  console.log(`Compiled workflow: ${outputPath}`)
}
