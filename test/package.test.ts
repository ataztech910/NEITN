import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

describe('package metadata', () => {
  it('declares esbuild as a runtime dependency for the published CLI', () => {
    expect(packageJson.dependencies?.esbuild).toBe('^0.28.0')
    expect(packageJson.devDependencies?.esbuild).toBeUndefined()
  })
})
