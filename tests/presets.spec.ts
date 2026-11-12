/** Palette catalog and the settings contract the appearance card writes. */
import { describe, expect, it } from 'vitest'
import {
  AW_STUDIO_PRESETS, AW_STUDIO_PRESET_IDS, DEFAULT_AW_STUDIO_PRESET, parseAwStudioPreset,
} from '../src/client/presets/catalog.ts'
import {
  AW_STUDIO_TRAIL_INTENSITY_MAX, AW_STUDIO_TRAIL_INTENSITY_MIN,
  DEFAULT_AW_STUDIO_SETTINGS, SETTINGS_NAMESPACE, decodeAwStudioSettings, isTrailIntensity, projectAwStudioSettings,
} from '../src/settings-contract.ts'

describe('palette catalog', () => {
  it('ships the five reviewed palettes in presentation order', () => {
    expect(AW_STUDIO_PRESET_IDS).toEqual(['aurora', 'midnight', 'ember', 'forest', 'graphite'])
    expect(DEFAULT_AW_STUDIO_PRESET).toBe('aurora')
  })

  it('gives every palette three brand stops and non-empty copy', () => {
    for (const id of AW_STUDIO_PRESET_IDS) {
      const preset = AW_STUDIO_PRESETS[id]
      expect(preset.trails, id).toHaveLength(3)
      for (const color of preset.trails) expect(color, id).toMatch(/^#[0-9a-f]{6}$/u)
      expect(preset.label.length, id).toBeGreaterThan(0)
      expect(preset.description.length, id).toBeGreaterThan(0)
    }
  })

  it('rejects every value that names no palette', () => {
    expect(parseAwStudioPreset('midnight')).toBe('midnight')
    for (const value of ['nope', '', 42, null, undefined, {}, ['aurora'], 'AURORA']) {
      expect(parseAwStudioPreset(value), String(value)).toBeUndefined()
    }
  })

  it('does not treat an inherited object key as a palette', () => {
    expect(parseAwStudioPreset('toString')).toBeUndefined()
    expect(parseAwStudioPreset('__proto__')).toBeUndefined()
  })
})

describe('settings contract', () => {
  it('pins the namespace to the Host plugin entry id', () => {
    expect(SETTINGS_NAMESPACE).toBe('dsh-skin')
  })

  it('decodes a complete section', () => {
    expect(decodeAwStudioSettings({ theme: 'ember', pointerTrails: false, trailIntensity: 0.4 }))
      .toEqual({ theme: 'ember', pointerTrails: false, trailIntensity: 0.4 })
  })

  it('rejects a section with any invalid field', () => {
    const valid = { theme: 'aurora', pointerTrails: true, trailIntensity: 0.6 }
    expect(decodeAwStudioSettings(valid)).toBeDefined()
    expect(decodeAwStudioSettings(null)).toBeUndefined()
    expect(decodeAwStudioSettings('aurora')).toBeUndefined()
    expect(decodeAwStudioSettings({ ...valid, theme: 'nope' })).toBeUndefined()
    expect(decodeAwStudioSettings({ ...valid, pointerTrails: 'yes' })).toBeUndefined()
    expect(decodeAwStudioSettings({ ...valid, trailIntensity: '0.6' })).toBeUndefined()
  })

  it('bounds the trail intensity to the range the slider offers', () => {
    const base = { theme: 'aurora', pointerTrails: true } as const
    expect(decodeAwStudioSettings({ ...base, trailIntensity: AW_STUDIO_TRAIL_INTENSITY_MIN })).toBeDefined()
    expect(decodeAwStudioSettings({ ...base, trailIntensity: AW_STUDIO_TRAIL_INTENSITY_MAX })).toBeDefined()
    expect(decodeAwStudioSettings({ ...base, trailIntensity: AW_STUDIO_TRAIL_INTENSITY_MIN - 0.01 })).toBeUndefined()
    expect(decodeAwStudioSettings({ ...base, trailIntensity: AW_STUDIO_TRAIL_INTENSITY_MAX + 0.01 })).toBeUndefined()
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(decodeAwStudioSettings({ ...base, trailIntensity: bad }), String(bad)).toBeUndefined()
    }
  })

  it.each([-2, 2, Number.NaN, Infinity, -Infinity, null])('projects legacy intensity %s without losing the other settings', intensity => {
    const input = { theme: 'ember', pointerTrails: false, trailIntensity: intensity }
    expect(projectAwStudioSettings(input)).toEqual({
      value: { theme: 'ember', pointerTrails: false, trailIntensity: DEFAULT_AW_STUDIO_SETTINGS.trailIntensity },
      invalidIntensity: true,
    })
    expect(input.trailIntensity).toBe(intensity)
    expect(decodeAwStudioSettings(input)).toBeUndefined()
  })

  it('keeps valid strengths and rejects unrelated malformed settings', () => {
    expect(projectAwStudioSettings({ theme: 'ember', pointerTrails: true, trailIntensity: 0.4 }))
      .toEqual({ value: { theme: 'ember', pointerTrails: true, trailIntensity: 0.4 }, invalidIntensity: false })
    expect(projectAwStudioSettings({ theme: 'ember', pointerTrails: true, trailIntensity: '0.4' })).toBeUndefined()
    expect(projectAwStudioSettings({ theme: 'unknown', pointerTrails: true, trailIntensity: 2 })).toBeUndefined()
    const wire = JSON.parse(JSON.stringify({ theme: 'ember', pointerTrails: false, trailIntensity: Number.NaN }))
    expect(projectAwStudioSettings(wire)?.invalidIntensity).toBe(true)
    expect(isTrailIntensity(0.2)).toBe(true)
    expect(isTrailIntensity(1)).toBe(true)
    for (const invalid of [-1, 2, Number.NaN, Infinity, null]) expect(isTrailIntensity(invalid)).toBe(false)
  })

  it('defaults to trails on with the aurora palette', () => {
    expect(decodeAwStudioSettings(DEFAULT_AW_STUDIO_SETTINGS)).toEqual(DEFAULT_AW_STUDIO_SETTINGS)
    expect(DEFAULT_AW_STUDIO_SETTINGS).toMatchObject({ theme: 'aurora', pointerTrails: true })
  })
})
