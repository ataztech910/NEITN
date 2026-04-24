import { describe, it, expect, vi, beforeEach } from 'vitest'
import { init } from '../src/commands/init'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

// Mock fs functions
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}))

describe('init', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, 'cwd').mockReturnValue('/current/dir')
  })

  it('creates directories and flow.yaml for the project', () => {
    const projectName = 'test-project'
    init(projectName)

    expect(mkdirSync).toHaveBeenCalledWith('/current/dir/test-project/nodes', { recursive: true })
    expect(mkdirSync).toHaveBeenCalledWith('/current/dir/test-project/edges', { recursive: true })
    expect(mkdirSync).toHaveBeenCalledWith('/current/dir/test-project/dist', { recursive: true })
    expect(mkdirSync).toHaveBeenCalledWith('/current/dir/test-project/.workflow/patches', { recursive: true })
    expect(mkdirSync).toHaveBeenCalledWith('/current/dir/test-project/.workflow/logs', { recursive: true })

    expect(writeFileSync).toHaveBeenCalledWith(
      '/current/dir/test-project/flow.yaml',
      'id: test_project\nname: Test Project\nentry: ""\nsettings: {}\n'
    )
  })
})