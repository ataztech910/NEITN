import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { codeBuild } from '../src/commands/code-build'
import { compile } from '../src/commands/compile'

function createProjectDir() {
  const dir = mkdtempSync(join(tmpdir(), 'wf-code-'))
  mkdirSync(join(dir, 'nodes'))
  mkdirSync(join(dir, 'edges'))
  mkdirSync(join(dir, 'code'))
  writeFileSync(join(dir, 'flow.yaml'), 'id: code_flow\nname: Code Flow\nentry: "normalize_input"\nsettings: {}\n')
  return dir
}

describe('code node source files', () => {
  it('builds .ts and .js source files into dist/code as .js', async () => {
    const projectDir = createProjectDir()
    writeFileSync(join(projectDir, 'code', 'normalize_input.ts'), 'export default 1\n')
    writeFileSync(join(projectDir, 'code', 'helper.js'), 'module.exports = 2\n')

    await codeBuild(projectDir)

    expect(existsSync(join(projectDir, 'dist', 'code', 'normalize_input.js'))).toBe(true)
    expect(existsSync(join(projectDir, 'dist', 'code', 'helper.js'))).toBe(true)

    rmSync(projectDir, { recursive: true, force: true })
  })

  it('compiles workflow with jsCodeFrom by building TS and injecting jsCode', async () => {
    const projectDir = createProjectDir()
    writeFileSync(
      join(projectDir, 'nodes', 'normalize-input.yaml'),
      [
        'id: normalize_input',
        'name: Normalize Input',
        'type: n8n-nodes-base.code',
        'params:',
        '  jsCodeFrom: code/normalize_input.ts',
        'ui:',
        '  column: 1',
        '  row: 1',
        ''
      ].join('\n')
    )
    writeFileSync(join(projectDir, 'code', 'normalize_input.ts'), 'const value = 1;\nconsole.log(value);\n')

    await compile(projectDir)

    const workflow = JSON.parse(readFileSync(join(projectDir, 'dist', 'code_flow.workflow.json'), 'utf-8'))
    expect(workflow.nodes).toHaveLength(1)
    expect(workflow.nodes[0].parameters.jsCode).toContain('const value = 1;')
    expect(workflow.nodes[0].parameters.jsCodeFrom).toBeUndefined()

    rmSync(projectDir, { recursive: true, force: true })
  })
})
