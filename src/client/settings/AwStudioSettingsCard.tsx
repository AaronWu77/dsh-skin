/** Appearance card: palette choice, pointer-trail toggle, and trail strength. */
import { useEffect, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsSectionOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  AW_STUDIO_TRAIL_INTENSITY_MAX, AW_STUDIO_TRAIL_INTENSITY_MIN,
} from '../../settings-contract.ts'
import type { AwStudioSettings } from '../../settings-contract.ts'
import type { AwStudioPresetId } from '../presets/catalog.ts'

/**
 * Declared by the settings shell at runtime. This plugin links the settings
 * package from the harness checkout, whose SlotMap augmentation resolves
 * against that checkout's own client-slots copy instead of this plugin's, so
 * the shape is repeated here for the registration to typecheck.
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** One first-class Settings page per list entry. */
    'settings.section': { kind: 'list'; scope: 'root'; owner: SettingsSectionOwnerProps }
  }
}


/** One palette row projected from the catalog. */
export interface AwStudioPresetRow {
  id: AwStudioPresetId
  label: string
  description: string
  trails: readonly [string, string, string]
}

/** Dependencies the client entry injects into the card. */
export interface AwStudioSettingsInjected {
  presets: readonly AwStudioPresetRow[]
  current: () => AwStudioSettings
  setTheme: (theme: AwStudioPresetId) => Promise<void>
  setPointerTrails: (on: boolean) => Promise<void>
  setTrailIntensity: (value: number) => Promise<void>
}

/** Props the renderer binds for this settings section. */
export type AwStudioSettingsCardProps = PropsRuntime<'settings.section'> & AwStudioSettingsInjected

const section = { display: 'flex', flexDirection: 'column' as const, gap: 18 }
const heading = { fontSize: 15, fontWeight: 600, margin: 0 }
const body = { fontSize: 13, lineHeight: 1.6, margin: 0, opacity: 0.72 }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }
const cardBase = {
  display: 'flex' as const, flexDirection: 'column' as const, gap: 7, padding: 11,
  borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2)', cursor: 'pointer',
  background: 'transparent', textAlign: 'left' as const, font: 'inherit',
  color: 'var(--dsw-alias-label-primary)',
}

/**
 * Render the appearance controls.
 * @param props - renderer seats plus the injected preset table and writers.
 * @returns the appearance card.
 */
export function AwStudioSettingsCard(props: AwStudioSettingsCardProps) {
  const [draft, setDraft] = useState<AwStudioSettings>(() => props.current())
  // The Host is the source of truth: a refused or externally changed write must
  // re-seat the controls instead of leaving the card showing a stale draft.
  useEffect(() => { setDraft(props.current()) }, [props])
  return <section style={section} aria-label="AW Studio appearance">
    <div>
      <h3 style={heading}>Theme palette</h3>
      <p style={body}>Each palette sets the aurora, glass tint, brand gradient and pointer-trail colors together.</p>
    </div>
    <div style={grid} role="radiogroup" aria-label="Theme palette">
      {props.presets.map(preset => {
        const selected = draft.theme === preset.id
        return <button
          key={preset.id}
          type="button"
          role="radio"
          aria-checked={selected}
          style={{ ...cardBase, borderColor: selected ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-border-l2)' }}
          onClick={() => {
            setDraft({ ...draft, theme: preset.id })
            void props.setTheme(preset.id)
          }}
        >
          <span style={{ display: 'flex', gap: 6 }}>
            {preset.trails.map(color => <i key={color} style={{ width: 18, height: 18, borderRadius: 6, background: color, display: 'block' }} />)}
          </span>
          <strong style={{ fontSize: 13 }}>{preset.label}</strong>
          <span style={body}>{preset.description}</span>
        </button>
      })}
    </div>

    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={draft.pointerTrails}
        onChange={event => {
          const next = event.currentTarget.checked
          setDraft({ ...draft, pointerTrails: next })
          void props.setPointerTrails(next)
        }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <strong style={{ fontSize: 13 }}>Pointer trails</strong>
        <span style={body}>Paint the ambient ribbon behind the frame. It follows the selected palette.</span>
      </span>
    </label>

    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>Trail strength</span>
      <input
        type="range"
        min={AW_STUDIO_TRAIL_INTENSITY_MIN}
        max={AW_STUDIO_TRAIL_INTENSITY_MAX}
        step={0.02}
        value={draft.trailIntensity}
        disabled={!draft.pointerTrails}
        onChange={event => {
          const next = Number(event.currentTarget.value)
          setDraft({ ...draft, trailIntensity: next })
          void props.setTrailIntensity(next)
        }}
      />
      <span style={body}>{draft.trailIntensity.toFixed(2)} × layer opacity</span>
    </label>
  </section>
}
