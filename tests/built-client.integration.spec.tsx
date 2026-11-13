// @vitest-environment jsdom
/** Optional composition test for an explicitly selected staged browser bundle. */
import { existsSync, readFileSync } from 'node:fs'
import * as jsxRuntime from 'react/jsx-runtime'
import { Context } from '@deepseek-ai/cordis'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { installRenderer } from './built-renderer.ts'
import { en, type SkinLocaleKey } from '../src/client/locales.ts'
import type { AwStudioSettings } from '../src/settings-contract.ts'

const artifact = process.env['DSH_SKIN_TEST_CLIENT']
if (artifact !== undefined && !existsSync(artifact)) throw new Error('DSH_SKIN_TEST_CLIENT must name an existing staged client bundle')
afterEach(cleanup)

interface Handoff {
  id: string
  factory: (require: (name: string) => object) => { apply: (ctx: Context) => void; inject: string[] }
}

describe.skipIf(artifact === undefined)('staged appearance client', () => {
  it('registers after the settings slot appears and keeps controls synchronized', async () => {
    if (artifact === undefined) throw new Error('missing staged appearance bundle')
    let handoff: Handoff | undefined
    const loaderWindow = window as Window & { __ModuleLoader__?: { load: (value: Handoff) => void } }
    const previousLoader = loaderWindow.__ModuleLoader__
    loaderWindow.__ModuleLoader__ = { load: value => { handoff = value } }
    const ctx = new Context()
    let view: ReturnType<typeof render> | undefined
    try {
      new Function(readFileSync(artifact, 'utf8'))()
      expect(handoff?.id).toBe('dsh-skin')
      if (handoff === undefined) throw new Error('appearance bundle did not register its factory')
      const plugin = handoff.factory(name => {
        if (name === 'react/jsx-runtime') return jsxRuntime
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return { StateDot: () => null, IconSparkleMedium: () => null }
        throw new Error('unexpected appearance bundle dependency: ' + name)
      })
      let snapshot: ConfigFormSnapshot<AwStudioSettings> = {
        status: 'ready', value: { theme: 'aurora', pointerTrails: false, trailIntensity: 0.62 },
        base: undefined, user: undefined, revision: 1, writable: true,
      }
      const listeners = new Set<() => void>()
      const set = vi.fn(async () => false)
      const form = {
        getSnapshot: () => snapshot,
        subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
        set,
      }
      const localeSnapshot = Object.freeze({ revision: 0 })
      const locale = {
        register: () => () => {},
        bind: () => (key: string, params?: Record<string, unknown>) => {
          const text = Object.hasOwn(en, key) ? en[key as SkinLocaleKey] : key
          return text.replace(/\{(\w+)\}/g, (_match, name: string) => String(params?.[name] ?? ''))
        },
        getSnapshot: () => localeSnapshot,
        subscribe: () => () => {},
      }
      ctx.provide('locale', locale)
      ctx.provide('configForms', { get: () => form, whileServed: (_names: readonly string[], register: () => () => void) => register() })
      await ctx.plugin({ apply: installRenderer }).await()
      const slots = ctx.get('slots')
      if (!slots) throw new Error('renderer did not provide slots')
      slots.installLocale(locale)
      const absent = Object.freeze({ key: undefined, hooks: {}, keyedHooks: {}, props: {} })
      const scope = { getSnapshot: () => absent, subscribe: () => () => {} }
      slots.installScope('session', { current: scope, bindingSource: () => scope })
      const fiber = ctx.plugin({ name: 'staged-skin', inject: plugin.inject, apply: plugin.apply })
      await fiber.await()
      slots.register({ name: 'root', children: { 'settings.section': { kind: 'list', scope: 'root' } } },
        ({ renderSlot }: PropsRenderSlots<'settings.section'>) => renderSlot('settings.section', { close: () => {} }))
      view = render(<>{slots.renderSlot('root', {})}</>)
      expect(screen.getByRole('radio', { name: /aurora/i }).getAttribute('aria-checked')).toBe('true')
      act(() => {
        snapshot = { ...snapshot, value: { theme: 'midnight', pointerTrails: false, trailIntensity: 0.9 }, revision: 2 }
        for (const listener of listeners) listener()
      })
      expect(screen.getByRole('radio', { name: /midnight/i }).getAttribute('aria-checked')).toBe('true')
      fireEvent.click(screen.getByRole('radio', { name: /ember/i }))
      await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.refused))
      expect(set).toHaveBeenCalledWith('theme', 'ember')
      expect(screen.getByRole('radio', { name: /midnight/i }).getAttribute('aria-checked')).toBe('true')
      view.unmount()
      await fiber.dispose()
      expect(listeners.size).toBe(0)
    } finally {
      view?.unmount()
      await ctx.fiber.dispose()
      if (previousLoader === undefined) delete loaderWindow.__ModuleLoader__
      else loaderWindow.__ModuleLoader__ = previousLoader
    }
  })
})
