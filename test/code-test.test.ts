import { describe, it, expect, vi, beforeEach } from 'vitest'

const { execSyncMock, globSyncMock, logMock, errorMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
  globSyncMock: vi.fn(),
  logMock: vi.fn(),
  errorMock: vi.fn()
}))

vi.mock('child_process', () => ({
  execSync: execSyncMock
}))

vi.mock('glob', () => ({
  glob: {
    sync: globSyncMock
  }
}))

import { codeTest } from '../src/commands/code-test'

describe('codeTest', () => {
  beforeEach(() => {
    execSyncMock.mockReset()
    globSyncMock.mockReset()
    logMock.mockReset()
    errorMock.mockReset()
    vi.spyOn(console, 'log').mockImplementation(logMock)
    vi.spyOn(console, 'error').mockImplementation(errorMock)
  })

  it('skips when no code tests are found', () => {
    globSyncMock.mockReturnValue([])

    codeTest('/project')

    expect(logMock).toHaveBeenCalledWith('No code tests found, skipping')
    expect(execSyncMock).not.toHaveBeenCalled()
  })

  it('runs vitest for discovered code tests', () => {
    globSyncMock.mockReturnValue(['normalize_input.test.ts', '__tests__/helper.test.js'])

    codeTest('/project')

    expect(execSyncMock).toHaveBeenCalledWith(
      'npx vitest run normalize_input.test.ts __tests__/helper.test.js',
      { stdio: 'inherit', cwd: '/project' }
    )
  })
})
