import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

export function init(projectName: string) {
  const projectDir = join(process.cwd(), projectName)

  // Create directories
  mkdirSync(join(projectDir, 'nodes'), { recursive: true })
  mkdirSync(join(projectDir, 'edges'), { recursive: true })
  mkdirSync(join(projectDir, 'dist'), { recursive: true })
  mkdirSync(join(projectDir, '.workflow', 'patches'), { recursive: true })
  mkdirSync(join(projectDir, '.workflow', 'logs'), { recursive: true })

  // Generate id and name
  const id = projectName.replace(/-/g, '_')
  const name = projectName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

  // Create flow.yaml
  const flowContent = `id: ${id}
name: ${name}
entry: ""
settings: {}
`
  writeFileSync(join(projectDir, 'flow.yaml'), flowContent)

  console.log(`Initialized workflow project: ${projectName}`)
}