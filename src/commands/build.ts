import { validate } from './validate'
import { doctor } from './doctor'
import { codeTest } from './code-test'
import { codeBuild } from './code-build'
import { compile } from './compile'

export interface BuildOptions {
  skipTests?: boolean
  skipDoctor?: boolean
}

export async function build(projectDir: string, options: BuildOptions = {}) {
  validate(projectDir)

  if (!options.skipDoctor) {
    const messages = doctor(projectDir)
    if (messages.length === 0) {
      console.log('Doctor found no issues')
    } else {
      for (const message of messages) {
        console.log(message)
      }
    }
  }

  if (!options.skipTests) {
    codeTest(projectDir)
  }

  await codeBuild(projectDir)
  await compile(projectDir, { noCodeBuild: true })
}
