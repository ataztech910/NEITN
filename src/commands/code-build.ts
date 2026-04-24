import { build } from 'esbuild'
import { join, dirname } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { glob } from 'glob'

export async function codeBuild(projectDir: string) {
  const codeDir = join(projectDir, 'code')
  const distCodeDir = join(projectDir, 'dist', 'code')

  if (!existsSync(codeDir)) {
    console.log('No code directory found, nothing to build')
    return
  }

  // Find all .ts files in code/ excluding __tests__
  const tsFiles = glob.sync('**/*.ts', { cwd: codeDir }).filter(file => !file.includes('__tests__'))

  if (tsFiles.length === 0) {
    console.log('No TypeScript files to build')
    return
  }

  mkdirSync(distCodeDir, { recursive: true })

  const entryPoints = tsFiles.map(file => join(codeDir, file))

  await build({
    entryPoints,
    outdir: distCodeDir,
    format: 'cjs',
    target: 'node18',
    sourcemap: false,
    minify: false,
    bundle: false,
  })

  console.log(`Built ${tsFiles.length} code files to ${distCodeDir}`)
}