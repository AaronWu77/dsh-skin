/** Appearance card: palette choice, pointer-trail toggle, and trail strength. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConfigForm, ConfigFormSnapshot, SettingsSectionOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  AW_STUDIO_TRAIL_INTENSITY_MAX, AW_STUDIO_TRAIL_INTENSITY_MIN, DEFAULT_AW_STUDIO_SETTINGS, projectAwStudioSettings,
} from '../../settings-contract.ts'
import type { AwStudioSettingsWire } from '../../settings-contract.ts'
import type { SettingsWrites, SettingsWriteSnapshot } from './settings-writes.ts'
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
  hooks: { settings: Pick<ConfigForm<AwStudioSettingsWire>, 'getSnapshot' | 'subscribe'>; writes: Pick<SettingsWrites, 'getSnapshot' | 'subscribe'> }
  setTheme: (theme: AwStudioPresetId) => Promise<void>
  setPointerTrails: (on: boolean) => Promise<void>
  setTrailIntensity: (value: number) => Promise<void>
}

/** Props the renderer binds for this settings section. */
export type AwStudioSettingsCardProps = PropsRuntime<'settings.section'> & PropsLocale<'dsh-skin'> & InjectFace<AwStudioSettingsInjected>

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
  const settings: ConfigFormSnapshot<AwStudioSettingsWire> = props.useSettings((snapshot: ConfigFormSnapshot<AwStudioSettingsWire>) => snapshot)
  const writes: SettingsWriteSnapshot = props.useWrites((snapshot: SettingsWriteSnapshot) => snapshot)
  const projection = projectAwStudioSettings(settings.value)
  const displayed = projection?.value ?? DEFAULT_AW_STUDIO_SETTINGS
  const invalidIntensity = projection?.invalidIntensity === true
  const disabled = projection === undefined || settings.status !== 'ready' || !settings.writable
    || writes.status === 'pending' || writes.status === 'unknown'
  const { t } = props
  return <section style={section} aria-label={t('appearance')}>
    <div>
      <h3 style={heading}>{t('palette')}</h3>
      <p style={body}>{t('paletteDescription')}</p>
      {writes.status === 'refused' || writes.status === 'unknown' || writes.status === 'invalid'
        ? <p role="alert" style={body}>{t(writes.status)}</p> : null}
    </div>
    <div style={grid} role="radiogroup" aria-label={t('palette')}>
      {props.presets.map(preset => {
        const selected = displayed.theme === preset.id
        return <button
          key={preset.id}
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          style={{ ...cardBase, borderColor: selected ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-border-l2)' }}
          onClick={() => { void props.setTheme(preset.id) }}
        >
          <span style={{ display: 'flex', gap: 6 }}>
            {preset.trails.map(color => <i key={color} style={{ width: 18, height: 18, borderRadius: 6, background: color, display: 'block' }} />)}
          </span>
          <strong style={{ fontSize: 13 }}>{t(`preset.${preset.id}.label`)}</strong>
          <span style={body}>{t(`preset.${preset.id}.description`)}</span>
        </button>
      })}
    </div>

    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={displayed.pointerTrails}
        disabled={disabled}
        onChange={event => { void props.setPointerTrails(event.currentTarget.checked) }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <strong style={{ fontSize: 13 }}>{t('trails')}</strong>
        <span style={body}>{t('trailsDescription')}</span>
      </span>
    </label>

    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{t('intensity')}</span>
      <input
        type="range"
        min={AW_STUDIO_TRAIL_INTENSITY_MIN}
        max={AW_STUDIO_TRAIL_INTENSITY_MAX}
        step={0.02}
        value={displayed.trailIntensity}
        disabled={disabled || !displayed.pointerTrails || invalidIntensity}
        onChange={event => { void props.setTrailIntensity(Number(event.currentTarget.value)) }}
      />
      {invalidIntensity
        ? <span role="alert" style={body}>{t('invalidIntensity', { value: DEFAULT_AW_STUDIO_SETTINGS.trailIntensity.toFixed(2) })}</span>
        : <span style={body}>{t('intensityValue', { value: displayed.trailIntensity.toFixed(2) })}</span>}
    </label>
    {invalidIntensity && <button type="button" disabled={disabled} style={{ ...cardBase, alignSelf: 'flex-start' }}
      onClick={() => { void props.setTrailIntensity(DEFAULT_AW_STUDIO_SETTINGS.trailIntensity) }}>
      {t('restoreIntensity')}
    </button>}
  </section>
}
