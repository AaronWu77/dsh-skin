import { readFileSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import * as Host from '../src/host/index.ts'

describe('default profile bundle', () => {
  it('supplies an empty configuration for the required Host schema', () => {
    const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
    const row = ['    - id: dsh-skin', '      name: dsh-skin', '      config: {}'].join('\n')
    expect(patch.replaceAll('\r\n', '\n')).toContain(row)
  })

  it('starts the Host plugin with the bundle default configuration', async () => {
    const ctx = new Context()
    try {
      const fiber = ctx.plugin(Host, {})
      await expect(fiber.await()).resolves.toBeDefined()
      expect(Host.Config({}).get()).toEqual({ theme: 'aurora', pointerTrails: true, trailIntensity: 0.62 })
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
