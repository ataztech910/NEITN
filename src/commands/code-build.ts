import { build } from 'esbuild'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { glob } from 'glob'

export async function codeBuild(projectDir: string) {
  const codeDir = join(projectDir, 'code')
  const distCodeDir = join(projectDir, 'dist', 'code')

  if (!existsSync(codeDir)) {
    console.log('No code directory found, nothing to build')
    return
  }

  // Find source files in code/ excluding tests
  const sourceFiles = glob
    .sync('**/*.{ts,js}', { cwd: codeDir })
    .filter(file => !file.includes('__tests__'))
    .filter(file => !file.endsWith('.test.ts') && !file.endsWith('.test.js'))

  if (sourceFiles.length === 0) {
    console.log('No code files to build')
    return
  }

  mkdirSync(distCodeDir, { recursive: true })

  const entryPoints = sourceFiles.map(file => join(codeDir, file))

  await build({
    entryPoints,
    outdir: distCodeDir,
    outbase: codeDir,
    format: 'cjs',
    target: 'node18',
    sourcemap: false,
    minify: false,
    bundle: true,
  })

  console.log(`Built ${sourceFiles.length} code files to ${distCodeDir}`)
}
