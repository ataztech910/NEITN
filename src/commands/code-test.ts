import { execSync } from 'child_process'
import { join } from 'path'

export function codeTest(projectDir: string) {
  const codeDir = join(projectDir, 'code')

  try {
    execSync(`npx vitest run ${codeDir}/**/*.test.ts`, { stdio: 'inherit', cwd: projectDir })
  } catch (error) {
    console.error('Code tests failed')
    process.exit(1)
  }
}