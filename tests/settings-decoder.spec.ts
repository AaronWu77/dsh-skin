import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { describe, expect, it, vi } from 'vitest'
import { installSettings } from './built-settings.ts'
import { Config } from '../src/host/index.ts'
import { projectAwStudioSettings } from '../src/settings-contract.ts'

describe('legacy settings wire decoding', () => {
  it('exposes and repairs a null-encoded non-finite strength through the real settings form', async () => {
    const schema = new z(Config.toJSON())
    schema.meta.volatile = false
    const value = { theme: 'ember', pointerTrails: false, trailIntensity: null }
    const row = { ns: 'dsh-skin', schema: schema.toJSON(), value, revision: 1, applies: 'live', secrets: [], autoGenerate: true }
    const describeSettings = vi.fn(async () => ({ ok: true as const, value: {
      writable: true, hasDocument: true, namespaces: [row],
    } }))
    const mutate = vi.fn(async () => ({ ok: true as const, value: {
      ...row, value: { ...value, trailIntensity: 0.62 }, revision: 2,
    } }))
    const ctx = new Context()
    ctx.provide('remote', { settings: { describe: describeSettings, mutate }, $on: () => () => {} })
    try {
      await ctx.plugin({ apply: plugin => { Reflect.apply(installSettings, undefined, [plugin]) } }).await()
      const forms = ctx.get('configForms')
      if (!forms) throw new Error('settings provider did not activate')
      const form = forms.get('dsh-skin')
      await vi.waitFor(() => expect(form.getSnapshot().status).toBe('ready'))
      expect(form.getSnapshot().value).toEqual(value)
      expect(projectAwStudioSettings(form.getSnapshot().value)).toMatchObject({
        value: { theme: 'ember', pointerTrails: false, trailIntensity: 0.62 }, invalidIntensity: true,
      })
      expect(mutate).not.toHaveBeenCalled()
      await expect(form.set('trailIntensity', 0.62)).resolves.toBe(true)
      expect(mutate).toHaveBeenCalledOnce()
      expect(projectAwStudioSettings(form.getSnapshot().value)).toMatchObject({ invalidIntensity: false })
    } finally { await ctx.fiber.dispose() }
  })
})
