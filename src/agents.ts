import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'

export type AgentProvider = 'codex' | 'generic'

export interface InstallAgentsOptions {
  ai?: AgentProvider
}

function copyDirectoryRecursive(sourceDir: string, targetDir: string) {
  mkdirSync(targetDir, { recursive: true })

  for (const entry of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, entry)
    const targetPath = join(targetDir, entry)
    const stats = statSync(sourcePath)

    if (stats.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath)
    } else {
      mkdirSync(dirname(targetPath), { recursive: true })
      copyFileSync(sourcePath, targetPath)
    }
  }
}

function packageRoot() {
  return resolve(__dirname, '..')
}

function codexAgentsContent() {
  return `# AGENTS

Use the neitn workflow contract for this repository.

Primary references:
- .agents/AGENTS.md
- .agents/skills/neitn/SKILL.md
- docs/neitn/

Human-facing interface:
- edit flow.yaml, nodes/*.yaml, edges/*.yaml, code/*

AI-facing mutation interface:
- Patch Schema v0 via .workflow/patches/*.json

Do not treat dist/*.workflow.json as source of truth.
`
}

export function installAgents(projectDir: string, options: InstallAgentsOptions = {}) {
  const ai = options.ai || 'generic'
  const root = packageRoot()

  const sourceAgentsDir = join(root, '.agents')
  const sourceDocsDir = join(root, 'docs', 'neitn')

  if (!existsSync(sourceAgentsDir) || !existsSync(sourceDocsDir)) {
    throw new Error('Bundled AI contract files are missing from this neitn installation')
  }

  const targetAgentsDir = join(projectDir, '.agents')
  const targetDocsDir = join(projectDir, 'docs', 'neitn')

  copyDirectoryRecursive(sourceAgentsDir, targetAgentsDir)
  copyDirectoryRecursive(sourceDocsDir, targetDocsDir)

  if (ai === 'codex') {
    writeFileSync(join(projectDir, 'AGENTS.md'), codexAgentsContent())
  }

  console.log(`Installed AI contract for ${ai} in ${projectDir}`)
}
