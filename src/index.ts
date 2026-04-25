#!/usr/bin/env node

import { AgentProvider, installAgents } from './agents'
import { init } from './commands/init'
import { validate } from './commands/validate'
import { compile } from './commands/compile'
import { apply } from './commands/apply'
import { migrate } from './commands/migrate'
import { doctor } from './commands/doctor'
import { codeBuild } from './commands/code-build'
import { codeTest } from './commands/code-test'
import { build } from './commands/build'
import { importWorkflow } from './commands/import'
import { codeScaffold } from './commands/code-scaffold'

const { version: CLI_VERSION } = require('../package.json') as { version: string }

function helpText() {
  return `neitn

Usage:
  neitn help
  neitn init <project-name> [--ai codex|generic]
  neitn agents:install [path] [--ai codex|generic]
  neitn validate [path]
  neitn doctor [path]
  neitn build [path] [--skip-tests] [--skip-doctor]
  neitn compile [path] [--no-code-build]
  neitn import <workflow.json> [--extract-code] [--overwrite]
  neitn apply <patch-file>
  neitn migrate [path]
  neitn code:scaffold <node_id> [--node]
  neitn code:test [path]
  neitn code:build [path]

Flags:
  -h, --help     Show help
  -v, --version  Show version
`
}

function parseProjectDir(args: string[]): string {
  return parsePositionalArg(args) || '.'
}

function parsePositionalArg(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--ai') {
      index += 1
      continue
    }
    if (!arg.startsWith('--')) {
      return arg
    }
  }
  return undefined
}

function parseAiProvider(args: string[]): AgentProvider | undefined {
  const aiIndex = args.indexOf('--ai')
  if (aiIndex === -1) {
    return undefined
  }

  const provider = args[aiIndex + 1]

  if (provider === 'codex' || provider === 'generic') {
    return provider
  }

  console.error('Usage: --ai codex|generic')
  process.exit(1)
}

export async function main(argv = process.argv) {
  const [, , command, ...args] = argv

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(helpText())
  } else if (command === '--version' || command === '-v') {
    console.log(CLI_VERSION)
  } else if (command === 'init') {
    const projectName = parsePositionalArg(args)
    if (!projectName) {
      console.error('Usage: neitn init <project-name> [--ai codex|generic]')
      process.exit(1)
    }
    init(projectName, { ai: parseAiProvider(args) })
  } else if (command === 'agents:install') {
    const projectDir = parseProjectDir(args)
    installAgents(projectDir, { ai: parseAiProvider(args) })
  } else if (command === 'validate') {
    const projectDir = args[0] || '.'
    validate(projectDir)
  } else if (command === 'compile') {
    const projectDir = parseProjectDir(args)
    const noCodeBuild = args.includes('--no-code-build')
    await compile(projectDir, { noCodeBuild })
  } else if (command === 'apply') {
    const patchFile = args[0]
    if (!patchFile) {
      console.error('Usage: neitn apply <patch-file>')
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
  } else if (command === 'code:scaffold') {
    const rawNodeId = args.find(arg => !arg.startsWith('--'))
    if (!rawNodeId) {
      console.error('Usage: neitn code:scaffold <node_id> [--node]')
      process.exit(1)
    }
    codeScaffold(process.cwd(), rawNodeId, { node: args.includes('--node') })
  } else if (command === 'build') {
    const projectDir = parseProjectDir(args)
    const skipTests = args.includes('--skip-tests')
    const skipDoctor = args.includes('--skip-doctor')
    await build(projectDir, { skipTests, skipDoctor })
  } else if (command === 'import') {
    const workflowPath = args.find(arg => !arg.startsWith('--'))
    if (!workflowPath) {
      console.error('Usage: neitn import <workflow.json> [--extract-code] [--overwrite]')
      process.exit(1)
    }
    const overwrite = args.includes('--overwrite')
    const importOptions = args.includes('--extract-code')
      ? { overwrite, extractCode: true }
      : { overwrite }
    importWorkflow(workflowPath, process.cwd(), importOptions)
  } else {
    console.error(`Unknown command: ${command}`)
    console.error(helpText())
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
