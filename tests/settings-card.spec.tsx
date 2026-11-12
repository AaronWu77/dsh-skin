// @vitest-environment jsdom
import { useSyncExternalStore } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { AwStudioSettingsCard } from '../src/client/settings/AwStudioSettingsCard.tsx'
import { SettingsWrites, type SettingsWriteSnapshot } from '../src/client/settings/settings-writes.ts'
import { AW_STUDIO_PRESETS, type AwStudioPresetId } from '../src/client/presets/catalog.ts'
import { en, zh, type SkinLocaleKey } from '../src/client/locales.ts'
import type { AwStudioSettings } from '../src/settings-contract.ts'

afterEach(cleanup)

const initial: AwStudioSettings = { theme: 'aurora', pointerTrails: false, trailIntensity: 0.62 }
const presets = Object.entries(AW_STUDIO_PRESETS).map(([id, preset]) => ({ id: id as AwStudioPresetId, ...preset }))
const t = (key: string, params?: Record<string, unknown>): string => {
  const text = Object.hasOwn(en, key) ? en[key as SkinLocaleKey] : key
  return text.replace(/\{(\w+)\}/g, (_match, name: string) => String(params?.[name] ?? ''))
}

function fixture(options: { value?: AwStudioSettings; writable?: boolean; set?: (field: string, value: unknown) => Promise<boolean> } = {}) {
  let snapshot: ConfigFormSnapshot<AwStudioSettings> = {
    status: 'ready', value: options.value ?? initial, base: undefined, user: undefined, revision: 1, writable: options.writable ?? true,
  }
  const listeners = new Set<() => void>()
  const set = vi.fn(options.set ?? (async () => true))
  const form = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set,
  }
  const writes = new SettingsWrites(form)
  const useSettings = <S,>(select: (value: ConfigFormSnapshot<AwStudioSettings>) => S): S =>
    select(useSyncExternalStore(form.subscribe, form.getSnapshot))
  const useWrites = <S,>(select: (value: SettingsWriteSnapshot) => S): S =>
    select(useSyncExternalStore(writes.subscribe, writes.getSnapshot))
  const props = {
    close: () => {}, presets, t, useSettings, useWrites,
    setTheme: (value: AwStudioPresetId) => writes.set('theme', value),
    setPointerTrails: (value: boolean) => writes.set('pointerTrails', value),
    setTrailIntensity: (value: number) => writes.set('trailIntensity', value),
  }
  return {
    form, writes, props,
    publish(next: Partial<ConfigFormSnapshot<AwStudioSettings>>) {
      snapshot = { ...snapshot, ...next }
      for (const listener of listeners) listener()
    },
  }
}

function selected(name: string): string | null { return screen.getByRole('radio', { name: new RegExp(name, 'i') }).getAttribute('aria-checked') }
function checkbox(): HTMLInputElement { return screen.getByRole('checkbox', { name: /pointer trails/i }) as HTMLInputElement }
function slider(): HTMLInputElement { return screen.getByRole('slider', { name: /trail strength/i }) as HTMLInputElement }
function gesture(control: 'theme' | 'trails' | 'intensity'): void {
  if (control === 'theme') fireEvent.click(screen.getByRole('radio', { name: /midnight/i }))
  else if (control === 'trails') fireEvent.click(checkbox())
  else fireEvent.change(slider(), { target: { value: '0.9' } })
}

describe('appearance settings card', () => {
  it('renders translated labels and write failures in Chinese', async () => {
    const f = fixture({ set: async () => false })
    const chinese = (key: string): string => Object.hasOwn(zh, key) ? zh[key as SkinLocaleKey] : key
    render(<AwStudioSettingsCard {...f.props} t={chinese} />)
    expect(screen.getByRole('radiogroup', { name: '主题配色' })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /午夜/ }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(zh.refused))
    f.writes.dispose()
  })

  it('tracks external Host changes across all controls', () => {
    const f = fixture()
    render(<AwStudioSettingsCard {...f.props} />)
    expect(selected('aurora')).toBe('true')
    act(() => f.publish({ value: { theme: 'midnight', pointerTrails: true, trailIntensity: 0.9 }, revision: 2 }))
    expect(selected('midnight')).toBe('true')
    expect(checkbox().checked).toBe(true)
    expect(slider().value).toBe('0.9')
    f.writes.dispose()
  })

  it.each(['theme', 'trails', 'intensity'] as const)('keeps confirmed values and reports a refused %s write', async control => {
    const value = { ...initial, pointerTrails: control === 'intensity' }
    const f = fixture({ value, set: async () => false })
    render(<AwStudioSettingsCard {...f.props} />)
    gesture(control)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.refused))
    expect(selected('aurora')).toBe('true')
    expect(checkbox().checked).toBe(value.pointerTrails)
    expect(slider().value).toBe('0.62')
    expect(f.form.set).toHaveBeenCalledOnce()
    f.writes.dispose()
  })

  it.each(['theme', 'trails', 'intensity'] as const)('holds an unconfirmed %s outcome across remounts', async control => {
    const value = { ...initial, pointerTrails: control === 'intensity' }
    const f = fixture({ value, set: async () => { throw new Error('synthetic transport failure') } })
    const mounted = render(<AwStudioSettingsCard {...f.props} />)
    gesture(control)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.unknown))
    expect(selected('aurora')).toBe('true')
    expect(checkbox().checked).toBe(value.pointerTrails)
    expect(slider().value).toBe('0.62')
    expect(checkbox().disabled).toBe(true)
    expect(slider().disabled).toBe(true)
    expect((screen.getByRole('radio', { name: /midnight/i }) as HTMLButtonElement).disabled).toBe(true)
    mounted.unmount()
    render(<AwStudioSettingsCard {...f.props} />)
    expect(screen.getByRole('alert').textContent).toBe(en.unknown)
    expect(checkbox().disabled).toBe(true)
    f.writes.dispose()
  })

  it.each([-1, 2, Number.NaN, Infinity])('keeps legacy intensity %s and offers an explicit repair', async intensity => {
    const legacy: AwStudioSettings = { theme: 'ember', pointerTrails: true, trailIntensity: intensity }
    const f = fixture({ value: legacy, set: async (field, value) => {
      if (field === 'trailIntensity' && typeof value === 'number') {
        f.publish({ value: { ...legacy, trailIntensity: value }, revision: 2 })
      }
      return true
    } })
    render(<AwStudioSettingsCard {...f.props} />)
    expect(selected('ember')).toBe('true')
    expect(checkbox().checked).toBe(true)
    expect(slider().disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toBe(t('invalidIntensity', { value: '0.62' }))
    expect(f.form.set).not.toHaveBeenCalled()
    expect(legacy.trailIntensity).toBe(intensity)
    fireEvent.click(screen.getByRole('button', { name: en.restoreIntensity }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(f.form.set).toHaveBeenCalledWith('trailIntensity', 0.62)
    expect(slider().disabled).toBe(false)
    expect(slider().value).toBe('0.62')
    f.writes.dispose()
  })

  it('offers repair for a non-finite strength serialized as null', () => {
    const wire: AwStudioSettings = JSON.parse(JSON.stringify({ theme: 'ember', pointerTrails: false, trailIntensity: Number.NaN }))
    const f = fixture({ value: wire })
    render(<AwStudioSettingsCard {...f.props} />)
    expect(selected('ember')).toBe('true')
    expect(screen.getByRole('alert').textContent).toBe(t('invalidIntensity', { value: '0.62' }))
    expect((screen.getByRole('button', { name: en.restoreIntensity }) as HTMLButtonElement).disabled).toBe(false)
    expect(f.form.set).not.toHaveBeenCalled()
    f.writes.dispose()
  })

  it('keeps a legacy value visible as unconfirmed when repair has an unknown result', async () => {
    const legacy: AwStudioSettings = { theme: 'ember', pointerTrails: false, trailIntensity: 2 }
    const f = fixture({ value: legacy, set: async () => { throw new Error('synthetic unknown outcome') } })
    const mounted = render(<AwStudioSettingsCard {...f.props} />)
    fireEvent.click(screen.getByRole('button', { name: en.restoreIntensity }))
    await waitFor(() => expect(screen.getByText(en.unknown)).toBeTruthy())
    expect(screen.getByText(t('invalidIntensity', { value: '0.62' }))).toBeTruthy()
    expect((screen.getByRole('button', { name: en.restoreIntensity }) as HTMLButtonElement).disabled).toBe(true)
    expect(legacy.trailIntensity).toBe(2)
    mounted.unmount()
    render(<AwStudioSettingsCard {...f.props} />)
    expect(screen.getByText(en.unknown)).toBeTruthy()
    expect((screen.getByRole('button', { name: en.restoreIntensity }) as HTMLButtonElement).disabled).toBe(true)
    f.writes.dispose()
  })

  it('keeps unrelated controls editable without rewriting an invalid strength', async () => {
    const legacy: AwStudioSettings = { theme: 'ember', pointerTrails: false, trailIntensity: 2 }
    const f = fixture({ value: legacy, set: async () => false })
    render(<AwStudioSettingsCard {...f.props} />)
    expect(selected('ember')).toBe('true')
    expect(checkbox().disabled).toBe(false)
    expect((screen.getByRole('radio', { name: /midnight/i }) as HTMLButtonElement).disabled).toBe(false)
    gesture('theme')
    await waitFor(() => expect(f.form.set).toHaveBeenCalledWith('theme', 'midnight'))
    expect(legacy.trailIntensity).toBe(2)
    f.writes.dispose()
  })

  it.each([-1, 2, Number.NaN, Infinity, -Infinity])('rejects a new invalid intensity %s before calling the Host', async intensity => {
    const f = fixture()
    await f.writes.set('trailIntensity', intensity)
    expect(f.form.set).not.toHaveBeenCalled()
    expect(f.writes.getSnapshot().status).toBe('invalid')
    await f.writes.set('trailIntensity', 0.2)
    expect(f.form.set).toHaveBeenCalledWith('trailIntensity', 0.2)
    expect(f.writes.getSnapshot().status).toBe('idle')
    f.writes.dispose()
  })

  it('allows a new gesture after a recovered refusal', async () => {
    let attempts = 0
    const f = fixture({ set: async () => {
      attempts++
      if (attempts === 1) return false
      f.publish({ value: { ...initial, theme: 'midnight' }, revision: 2 })
      return true
    } })
    render(<AwStudioSettingsCard {...f.props} />)
    gesture('theme')
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.refused))
    expect(selected('aurora')).toBe('true')
    gesture('theme')
    await waitFor(() => expect(selected('midnight')).toBe('true'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(f.form.set).toHaveBeenCalledTimes(2)
    f.writes.dispose()
  })

  it('retains an unknown result when a write rejects while the page is unmounted', async () => {
    let reject!: (error: Error) => void
    const pending = new Promise<boolean>((_resolve, rejectPromise) => { reject = rejectPromise })
    const f = fixture({ set: () => pending })
    const mounted = render(<AwStudioSettingsCard {...f.props} />)
    gesture('theme')
    mounted.unmount()
    reject(new Error('synthetic unknown outcome'))
    await waitFor(() => expect(f.writes.getSnapshot().status).toBe('unknown'))
    render(<AwStudioSettingsCard {...f.props} />)
    expect(screen.getByRole('alert').textContent).toBe(en.unknown)
    expect(checkbox().disabled).toBe(true)
    f.writes.dispose()
  })

  it('waits for an accepted value and serializes concurrent gestures', async () => {
    let settle!: (accepted: boolean) => void
    const pending = new Promise<boolean>(resolve => { settle = resolve })
    const f = fixture({ set: () => pending })
    render(<AwStudioSettingsCard {...f.props} />)
    gesture('theme')
    expect(selected('aurora')).toBe('true')
    expect(checkbox().disabled).toBe(true)
    await f.writes.set('pointerTrails', true)
    expect(f.form.set).toHaveBeenCalledOnce()
    await act(async () => {
      f.publish({ value: { ...initial, theme: 'midnight' }, revision: 2 })
      settle(true)
      await pending
    })
    expect(selected('midnight')).toBe('true')
    expect(checkbox().disabled).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
    f.writes.dispose()
  })

  it('disables controls when the Host is read-only or the namespace is unavailable', () => {
    const f = fixture({ writable: false })
    render(<AwStudioSettingsCard {...f.props} />)
    expect(checkbox().disabled).toBe(true)
    expect((screen.getByRole('radio', { name: /midnight/i }) as HTMLButtonElement).disabled).toBe(true)
    act(() => f.publish({ status: 'unavailable', value: undefined, writable: true }))
    expect(checkbox().disabled).toBe(true)
    expect(f.form.set).not.toHaveBeenCalled()
    f.writes.dispose()
  })

  it('does not admit a write when disposal reenters the pending notification', async () => {
    const f = fixture()
    f.writes.subscribe(() => { if (f.writes.getSnapshot().status === 'pending') f.writes.dispose() })
    await f.writes.set('theme', 'midnight')
    expect(f.form.set).not.toHaveBeenCalled()
  })

  it('contains a late rejected write after unmount and disposal', async () => {
    let reject!: (error: Error) => void
    const pending = new Promise<boolean>((_resolve, rejectPromise) => { reject = rejectPromise })
    const f = fixture({ set: () => pending })
    const mounted = render(<AwStudioSettingsCard {...f.props} />)
    gesture('theme')
    const snapshot = f.writes.getSnapshot()
    mounted.unmount()
    f.writes.dispose()
    reject(new Error('synthetic late failure'))
    await act(async () => { await pending.catch(() => {}) })
    expect(f.writes.getSnapshot()).toBe(snapshot)
    await f.writes.set('theme', 'ember')
    expect(f.form.set).toHaveBeenCalledOnce()
  })
})
