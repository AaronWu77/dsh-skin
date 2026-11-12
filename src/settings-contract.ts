/**
 * Node-free settings contract shared by the Host plugin and the browser card.
 * @module dsh-aw-studio/settings-contract
 */
import { AW_STUDIO_PRESET_IDS, DEFAULT_AW_STUDIO_PRESET, parseAwStudioPreset } from './client/presets/catalog.ts'
import type { AwStudioPresetId } from './client/presets/catalog.ts'

/** Settings namespace owned by this plugin. */
export const SETTINGS_NAMESPACE = 'dsh-skin' as const

/** Every field the appearance card edits. */
export interface AwStudioSettings {
  /** Active palette preset. */
  readonly theme: AwStudioPresetId
  /** Whether the ambient pointer-trail canvas is painted. */
  readonly pointerTrails: boolean
  /** Trail opacity multiplier, 0.2 to 1. */
  readonly trailIntensity: number
}

/** Defaults applied before any user choice. */
export const DEFAULT_AW_STUDIO_SETTINGS: AwStudioSettings = {
  theme: DEFAULT_AW_STUDIO_PRESET,
  pointerTrails: true,
  trailIntensity: 0.62,
}

/** Smallest and largest accepted trail intensity. */
export const AW_STUDIO_TRAIL_INTENSITY_MIN = 0.2
export const AW_STUDIO_TRAIL_INTENSITY_MAX = 1

/** @param value - Candidate trail strength. @returns Whether it is finite and within the supported range. */
export function isTrailIntensity(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
    && value >= AW_STUDIO_TRAIL_INTENSITY_MIN && value <= AW_STUDIO_TRAIL_INTENSITY_MAX
}

/** Decoded settings as served on the wire; null may represent a non-finite stored strength. */
export interface AwStudioSettingsWire {
  readonly theme: AwStudioPresetId
  readonly pointerTrails: boolean
  readonly trailIntensity: number | null
}

/**
 * Decode the settings section without discarding a legacy invalid trail strength.
 * @param input - Candidate read from configuration or the wire.
 * @returns The accepted section, or undefined for other invalid fields.
 */
export function decodeAwStudioSettingsWire(input: unknown): AwStudioSettingsWire | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const record = input as Record<string, unknown>
  const theme = parseAwStudioPreset(record['theme'])
  const pointerTrails = record['pointerTrails']
  const intensity = record['trailIntensity']
  if (theme === undefined || typeof pointerTrails !== 'boolean') return undefined
  // JSON represents a non-finite number as null on the settings wire.
  if (typeof intensity !== 'number' && intensity !== null) return undefined
  return { theme, pointerTrails, trailIntensity: intensity }
}

/** Appearance-safe values and whether the stored trail strength needs repair. */
export interface AwStudioSettingsProjection {
  readonly value: AwStudioSettings
  readonly invalidIntensity: boolean
}

/**
 * Project legacy invalid trail strengths to a safe appearance without writing configuration.
 * @param input - Candidate read from configuration or the wire.
 * @returns The safe appearance and repair status, or undefined for other invalid fields.
 */
export function projectAwStudioSettings(input: unknown): AwStudioSettingsProjection | undefined {
  const decoded = decodeAwStudioSettingsWire(input)
  if (decoded === undefined) return undefined
  const valid = isTrailIntensity(decoded.trailIntensity)
  return {
    value: { theme: decoded.theme, pointerTrails: decoded.pointerTrails,
      trailIntensity: valid ? decoded.trailIntensity : DEFAULT_AW_STUDIO_SETTINGS.trailIntensity },
    invalidIntensity: !valid,
  }
}

/**
 * Validate a complete settings value.
 * @param value - Candidate read from configuration or the browser.
 * @returns The narrowed settings, or undefined when any field is invalid.
 */
export function decodeAwStudioSettings(value: unknown): AwStudioSettings | undefined {
  const projection = projectAwStudioSettings(value)
  return projection === undefined || projection.invalidIntensity ? undefined : projection.value
}

/** Every preset id, re-exported for the settings card without duplicating the catalog. */
export { AW_STUDIO_PRESET_IDS }
