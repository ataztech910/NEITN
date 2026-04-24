import { createCodeNodeSplitFiles } from '../code-node'

export function codeScaffold(projectDir: string, nodeId: string, options: { node?: boolean } = {}) {
  const result = createCodeNodeSplitFiles(projectDir, nodeId, {
    createNodeYaml: options.node
  })

  console.log(`Scaffolded code node: ${result.nodeId}`)
}
