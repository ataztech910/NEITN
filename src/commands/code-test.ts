import { execSync } from 'child_process'
import { join } from 'path'
import { glob } from 'glob'

export function codeTest(projectDir: string) {
  const codeDir = join(projectDir, 'code')
  const testFiles = glob.sync(['**/*.test.ts', '**/*.test.js', '**/__tests__/*.test.ts', '**/__tests__/*.test.js'], {
    cwd: codeDir
  })

  if (testFiles.length === 0) {
    console.log('No code tests found, skipping')
    return
  }

  try {
    execSync(`npx vitest run ${testFiles.join(' ')}`, { stdio: 'inherit', cwd: projectDir })
  } catch (error) {
    console.error('Code tests failed')
    process.exit(1)
  }
}
