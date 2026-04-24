import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { doctor } from '../src/commands/doctor'

function createProjectDir() {
  const dir = mkdtempSync(join('/tmp', 'wf-doctor-'))
  mkdirSync(join(dir, 'nodes'))
  mkdirSync(join(dir, 'edges'))
  writeFileSync(join(dir, 'flow.yaml'), 'id: test\nname: Test\nentry: "manual_trigger"\nsettings: {}\n')
  return dir
}

function writeNode(dir: string, filename: string, content: string) {
  writeFileSync(join(dir, 'nodes', filename), content)
}

function writeEdges(dir: string, connections: string) {
  writeFileSync(join(dir, 'edges', 'main.yaml'), connections)
}

describe('doctor', () => {
  it('reports no warnings for valid contracts and fields', () => {
    const projectDir = createProjectDir()

    writeNode(
      projectDir,
      'manual_trigger.yaml',
      'id: manual_trigger\nname: Manual Trigger\ntype: n8n-nodes-base.manualTrigger\nparams: {}\nui:\n  column: 1\n  row: 1\ncontract:\n  output:\n    fields:\n      user_id: string\n'
    )

    writeNode(
      projectDir,
      'http_request.yaml',
      'id: http_request\nname: HTTP Request\ntype: n8n-nodes-base.httpRequest\nparams:\n  url: ={{ $json.user_id }}\nui:\n  column: 1\n  row: 2\ncontract:\n  input:\n    fields:\n      user_id: string\n  output:\n    fields:\n      email: string\n'
    )

    writeNode(
      projectDir,
      'telegram_send.yaml',
      'id: telegram_send\nname: Telegram Send\ntype: n8n-nodes-base.telegram\nparams:\n  text: ={{ $json.email }}\nui:\n  column: 1\n  row: 3\ncontract:\n  input:\n    fields:\n      email: string\n'
    )

    writeEdges(projectDir, 'connections:\n  - from: manual_trigger\n    to: http_request\n  - from: http_request\n    to: telegram_send\n')

    const messages = doctor(projectDir)
    expect(messages).toEqual([])
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('warns when a node uses a missing upstream field', () => {
    const projectDir = createProjectDir()

    writeNode(
      projectDir,
      'manual_trigger.yaml',
      'id: manual_trigger\nname: Manual Trigger\ntype: n8n-nodes-base.manualTrigger\nparams: {}\nui:\n  column: 1\n  row: 1\ncontract:\n  output:\n    fields:\n      user_id: string\n'
    )

    writeNode(
      projectDir,
      'telegram_send.yaml',
      'id: telegram_send\nname: Telegram Send\ntype: n8n-nodes-base.telegram\nparams:\n  text: ={{ $json.email }}\nui:\n  column: 1\n  row: 2\n'
    )

    writeEdges(projectDir, 'connections:\n  - from: manual_trigger\n    to: telegram_send\n')

    const messages = doctor(projectDir)
    expect(messages).toContain("WARN: Node telegram_send uses field 'email' not declared in upstream contract")
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('warns when IF node checks a missing upstream field', () => {
    const projectDir = createProjectDir()

    writeNode(
      projectDir,
      'manual_trigger.yaml',
      'id: manual_trigger\nname: Manual Trigger\ntype: n8n-nodes-base.manualTrigger\nparams: {}\nui:\n  column: 1\n  row: 1\ncontract:\n  output:\n    fields:\n      status: string\n'
    )

    writeNode(
      projectDir,
      'if_check.yaml',
      'id: if_check\nname: IF Check\ntype: n8n-nodes-base.if\nparams:\n  conditions:\n    - value1: ={{ $json.missing_field }}\n      operation: equal\n      value2: true\nui:\n  column: 1\n  row: 2\n'
    )

    writeEdges(projectDir, 'connections:\n  - from: manual_trigger\n    to: if_check\n')

    const messages = doctor(projectDir)
    expect(messages).toContain("WARN: IF node if_check checks 'missing_field' but upstream does not define it")
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('warns when a node input contract is not provided upstream', () => {
    const projectDir = createProjectDir()

    writeNode(
      projectDir,
      'manual_trigger.yaml',
      'id: manual_trigger\nname: Manual Trigger\ntype: n8n-nodes-base.manualTrigger\nparams: {}\nui:\n  column: 1\n  row: 1\ncontract:\n  output:\n    fields:\n      user_id: string\n'
    )

    writeNode(
      projectDir,
      'telegram_send.yaml',
      'id: telegram_send\nname: Telegram Send\ntype: n8n-nodes-base.telegram\nparams:\n  text: ={{ $json.user_id }}\nui:\n  column: 1\n  row: 2\ncontract:\n  input:\n    fields:\n      email: string\n'
    )

    writeEdges(projectDir, 'connections:\n  - from: manual_trigger\n    to: telegram_send\n')

    const messages = doctor(projectDir)
    expect(messages).toContain("WARN: Node telegram_send expects 'email' but upstream does not provide it")
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('deduplicates missing field warnings for expression usage and contract input mismatch', () => {
    const projectDir = createProjectDir()

    writeNode(
      projectDir,
      'manual_trigger.yaml',
      'id: manual_trigger\nname: Manual Trigger\ntype: n8n-nodes-base.manualTrigger\nparams: {}\nui:\n  column: 1\n  row: 1\n'
    )

    writeNode(
      projectDir,
      'telegram_send.yaml',
      'id: telegram_send\nname: Telegram Send\ntype: n8n-nodes-base.telegram\nparams:\n  text: ={{ $json.user_id }}\nui:\n  column: 1\n  row: 2\ncontract:\n  input:\n    fields:\n      user_id: string\n'
    )

    writeEdges(projectDir, 'connections:\n  - from: manual_trigger\n    to: telegram_send\n')

    const messages = doctor(projectDir)
    expect(messages).toContain("WARN: Node telegram_send requires field 'user_id', but upstream does not provide it")
    expect(messages.filter(m => m.includes("requires field 'user_id'"))).toHaveLength(1)
    expect(messages.filter(m => m.includes("uses field 'user_id'"))).toHaveLength(0)
    expect(messages.filter(m => m.includes("expects 'user_id'"))).toHaveLength(0)
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('warns and does not crash for nodes missing type', () => {
    const projectDir = createProjectDir()

    writeNode(
      projectDir,
      'manual_trigger.yaml',
      'id: manual_trigger\nname: Manual Trigger\nparams: {}\nui:\n  column: 1\n  row: 1\n'
    )

    writeNode(
      projectDir,
      'telegram_send.yaml',
      'id: telegram_send\nname: Telegram Send\nparams:\n  text: ={{ $json.user_id }}\nui:\n  column: 1\n  row: 2\n'
    )

    writeEdges(projectDir, 'connections:\n  - from: manual_trigger\n    to: telegram_send\n')

    const messages = doctor(projectDir)
    expect(messages).toContain('WARN: NODE_MISSING_TYPE for node manual_trigger')
    expect(messages).toContain("WARN: Node telegram_send uses field 'user_id' not declared in upstream contract")
    rmSync(projectDir, { recursive: true, force: true })
  })
})