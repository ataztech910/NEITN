import { beforeEach, describe, expect, it, vi } from 'vitest'

const initMock = vi.fn()
const installAgentsMock = vi.fn()

vi.mock('../src/agents', () => ({
  installAgents: installAgentsMock,
}))

vi.mock('../src/commands/init', () => ({
  init: initMock,
}))

vi.mock('../src/commands/validate', () => ({
  validate: vi.fn(),
}))

vi.mock('../src/commands/compile', () => ({
  compile: vi.fn(),
}))

vi.mock('../src/commands/apply', () => ({
  apply: vi.fn(),
}))

vi.mock('../src/commands/migrate', () => ({
  migrate: vi.fn(() => ({ diagnostics: [], applied: 0, skipped: 0 })),
}))

vi.mock('../src/commands/doctor', () => ({
  doctor: vi.fn(() => []),
}))

vi.mock('../src/commands/code-build', () => ({
  codeBuild: vi.fn(),
}))

vi.mock('../src/commands/code-test', () => ({
  codeTest: vi.fn(),
}))

vi.mock('../src/commands/build', () => ({
  build: vi.fn(),
}))

vi.mock('../src/commands/import', () => ({
  importWorkflow: vi.fn(),
}))

vi.mock('../src/commands/code-scaffold', () => ({
  codeScaffold: vi.fn(),
}))

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes --ai through init', async () => {
    const { main } = await import('../src/index')

    await main(['node', 'neitn', 'init', 'my-flow', '--ai', 'codex'])

    expect(initMock).toHaveBeenCalledWith('my-flow', { ai: 'codex' })
  })

  it('installs AI contract into an existing project', async () => {
    const { main } = await import('../src/index')

    await main(['node', 'neitn', 'agents:install', '.', '--ai', 'codex'])

    expect(installAgentsMock).toHaveBeenCalledWith('.', { ai: 'codex' })
  })

  it('prints help when called with help', async () => {
    const { main } = await import('../src/index')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(['node', 'neitn', 'help'])

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('neitn code:scaffold <node_id> [--node]'))
  })

  it('prints help when no command is provided', async () => {
    const { main } = await import('../src/index')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(['node', 'neitn'])

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('neitn agents:install [path] [--ai codex|generic]'))
  })

  it('prints version when called with --version', async () => {
    const { main } = await import('../src/index')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(['node', 'neitn', '--version'])

    expect(logSpy).toHaveBeenCalledWith('0.1.0')
  })
})
