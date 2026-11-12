import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import * as Host from '../src/host/index.ts'
import { apply, Config } from '../src/host/index.ts'

const input = (trailIntensity: number) => ({ theme: 'aurora' as const, pointerTrails: false, trailIntensity })

describe('appearance settings Host validation', () => {
  it('activates the Host plugin with a valid volatile configuration', async () => {
    const ctx = new Context()
    try {
      const fiber = ctx.plugin(Host, input(0.62))
      await expect(fiber.await()).resolves.toBeDefined()
    } finally { await ctx.fiber.dispose() }
  })

  it.each([0.2, 0.62, 1])('accepts an intensity of %s without a warning', value => {
    const ctx = new Context()
    const warn = vi.spyOn(ctx.logger, 'warn').mockImplementation(() => {})
    const config = Config(input(value))
    expect(config.get().trailIntensity).toBe(value)
    apply(ctx, config)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each([0.19, 1.01, Number.NaN, Infinity, -Infinity])('keeps legacy intensity %s and reports it without rejecting startup', async value => {
    const ctx = new Context()
    const warn = vi.spyOn(ctx.logger, 'warn').mockImplementation(() => {})
    try {
      const config = Config(input(value))
      expect(config.get().trailIntensity).toBe(value)
      apply(ctx, config)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('trailIntensity'))
      const fiber = ctx.plugin(Host, input(value))
      await expect(fiber.await()).resolves.toBeDefined()
      expect(config.get().trailIntensity).toBe(value)
    } finally { await ctx.fiber.dispose() }
  })
})
