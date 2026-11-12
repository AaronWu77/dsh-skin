// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { installRenderer } from './built-renderer.ts'
import * as Skin from '../src/client/index.tsx'
import { en, type SkinLocaleKey } from '../src/client/locales.ts'
import type { AwStudioSettings } from '../src/settings-contract.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ StateDot: () => null }))
afterEach(cleanup)

/** Bind the production entry through the real renderer to a synthetic Host settings mirror. */
describe('appearance settings renderer integration', () => {
  it('binds the form observable, displays external changes, and reports rejected writes', async () => {
    const ctx = new Context()
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
    let view: ReturnType<typeof render> | undefined
    try {
      await ctx.plugin({ apply: installRenderer }).await()
      const slots = ctx.get('slots')
      if (!slots) throw new Error('renderer did not provide slots')
      slots.installLocale(locale)
      const absent = Object.freeze({ key: undefined, hooks: {}, keyedHooks: {}, props: {} })
      const scope = { getSnapshot: () => absent, subscribe: () => () => {} }
      slots.installScope('session', { current: scope, bindingSource: () => scope })
      slots.register({ name: 'root', children: { 'settings.section': { kind: 'list', scope: 'root' } } },
        ({ renderSlot }: PropsRenderSlots<'settings.section'>) => renderSlot('settings.section', { close: () => {} }))
      const fiber = ctx.plugin(Skin)
      await fiber.await()
      view = render(<>{slots.renderSlot('root', {})}</>)
      expect(screen.getByRole('radio', { name: /aurora/i }).getAttribute('aria-checked')).toBe('true')
      act(() => {
        snapshot = { ...snapshot, value: { theme: 'midnight', pointerTrails: false, trailIntensity: 0.9 }, revision: 2 }
        for (const listener of listeners) listener()
      })
      expect(screen.getByRole('radio', { name: /midnight/i }).getAttribute('aria-checked')).toBe('true')
      expect((screen.getByRole('slider', { name: /trail strength/i }) as HTMLInputElement).value).toBe('0.9')
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
    }
  })
})
