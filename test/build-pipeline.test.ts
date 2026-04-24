import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const {
  validateMock,
  doctorMock,
  codeTestMock,
  codeBuildMock,
  compileMock
} = vi.hoisted(() => ({
  validateMock: vi.fn(),
  doctorMock: vi.fn(),
  codeTestMock: vi.fn(),
  codeBuildMock: vi.fn(),
  compileMock: vi.fn()
}))

vi.mock('../src/commands/validate', () => ({
  validate: validateMock
}))

vi.mock('../src/commands/doctor', () => ({
  doctor: doctorMock
}))

vi.mock('../src/commands/code-test', () => ({
  codeTest: codeTestMock
}))

vi.mock('../src/commands/code-build', () => ({
  codeBuild: codeBuildMock
}))

vi.mock('../src/commands/compile', async () => {
  const actual = await vi.importActual<typeof import('../src/commands/compile')>('../src/commands/compile')
  return {
    ...actual,
    compile: compileMock
  }
})

import { build } from '../src/commands/build'
import { main } from '../src/index'

describe('build pipeline', () => {
  beforeEach(() => {
    validateMock.mockReset()
    doctorMock.mockReset()
    codeTestMock.mockReset()
    codeBuildMock.mockReset()
    compileMock.mockReset()
    doctorMock.mockReturnValue([])
    codeBuildMock.mockResolvedValue(undefined)
    compileMock.mockResolvedValue(undefined)
  })

  it('runs validate -> doctor -> code:test -> code:build -> compile', async () => {
    const order: string[] = []
    validateMock.mockImplementation(() => order.push('validate'))
    doctorMock.mockImplementation(() => {
      order.push('doctor')
      return []
    })
    codeTestMock.mockImplementation(() => order.push('code:test'))
    codeBuildMock.mockImplementation(async () => {
      order.push('code:build')
    })
    compileMock.mockImplementation(async () => {
      order.push('compile')
    })

    await build('/project')

    expect(order).toEqual(['validate', 'doctor', 'code:test', 'code:build', 'compile'])
    expect(compileMock).toHaveBeenCalledWith('/project', { noCodeBuild: true })
  })

  it('skips doctor and tests when flags are set', async () => {
    await build('/project', { skipDoctor: true, skipTests: true })

    expect(validateMock).toHaveBeenCalledWith('/project')
    expect(doctorMock).not.toHaveBeenCalled()
    expect(codeTestMock).not.toHaveBeenCalled()
    expect(codeBuildMock).toHaveBeenCalledWith('/project')
    expect(compileMock).toHaveBeenCalledWith('/project', { noCodeBuild: true })
  })

  it('stops on first failed step', async () => {
    validateMock.mockImplementation(() => {
      throw new Error('validate failed')
    })

    await expect(build('/project')).rejects.toThrow('validate failed')
    expect(doctorMock).not.toHaveBeenCalled()
    expect(codeTestMock).not.toHaveBeenCalled()
    expect(codeBuildMock).not.toHaveBeenCalled()
    expect(compileMock).not.toHaveBeenCalled()
  })

  it('passes CLI flags to build and compile commands', async () => {
    await main(['node', 'wf', 'build', '/repo', '--skip-tests', '--skip-doctor'])
    expect(validateMock).toHaveBeenCalledWith('/repo')
    expect(doctorMock).not.toHaveBeenCalled()
    expect(codeTestMock).not.toHaveBeenCalled()

    await main(['node', 'wf', 'compile', '/repo', '--no-code-build'])
    expect(compileMock).toHaveBeenCalledWith('/repo', { noCodeBuild: true })
  })
})

describe('compile --no-code-build', () => {
  it('fails when compiled code is missing', async () => {
    const { compile: realCompile } = await vi.importActual<typeof import('../src/commands/compile')>('../src/commands/compile')
    const projectDir = mkdtempSync(join(tmpdir(), 'wf-compile-'))
    mkdirSync(join(projectDir, 'nodes'))
    mkdirSync(join(projectDir, 'edges'))
    mkdirSync(join(projectDir, 'code'))
    writeFileSync(join(projectDir, 'flow.yaml'), 'id: code_flow\nname: Code Flow\nentry: "normalize_input"\nsettings: {}\n')
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

    await expect(realCompile(projectDir, { noCodeBuild: true })).rejects.toThrow(/Compiled code file not found/)

    rmSync(projectDir, { recursive: true, force: true })
  })
})
