#!/usr/bin/env node

import { init } from './commands/init'
import { validate } from './commands/validate'
import { compile } from './commands/compile'
import { apply } from './commands/apply'
import { migrate } from './commands/migrate'
import { doctor } from './commands/doctor'
import { codeBuild } from './commands/code-build'
import { codeTest } from './commands/code-test'

async function main() {
  const [, , command, ...args] = process.argv

  if (command === 'init') {
    const projectName = args[0]
    if (!projectName) {
      console.error('Usage: wf init <project-name>')
      process.exit(1)
    }
    init(projectName)
  } else if (command === 'validate') {
    const projectDir = args[0] || '.'
    validate(projectDir)
  } else if (command === 'compile') {
    const projectDir = args[0] || '.'
    await compile(projectDir)
  } else if (command === 'apply') {
    const patchFile = args[0]
    if (!patchFile) {
      console.error('Usage: wf apply <patch-file>')
      process.exit(1)
    }
    apply(patchFile)
  } else if (command === 'migrate') {
    const projectDir = args[0] || '.'
    const result = migrate(projectDir)
    if (result.diagnostics.length > 0) {
      console.error('Migration failed:')
      for (const diag of result.diagnostics) {
        console.error(`- ${diag.message}`)
      }
      process.exit(1)
    }
    console.log(`Migration complete: ${result.applied} applied, ${result.skipped} skipped`)
  } else if (command === 'doctor') {
    const projectDir = args[0] || '.'
    const messages = doctor(projectDir)
    if (messages.length === 0) {
      console.log('Doctor found no issues')
    } else {
      for (const message of messages) {
        console.log(message)
      }
    }
  } else if (command === 'code:build') {
    const projectDir = args[0] || '.'
    await codeBuild(projectDir)
  } else if (command === 'code:test') {
    const projectDir = args[0] || '.'
    codeTest(projectDir)
  } else {
    console.error('Unknown command')
    process.exit(1)
  }
}

main().catch(console.error)