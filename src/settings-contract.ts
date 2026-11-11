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

/**
 * Validate a complete settings value.
 * @param value - candidate read from configuration or the browser.
 * @returns the narrowed settings, or undefined when any field is invalid.
 */
export function decodeAwStudioSettings(value: unknown): AwStudioSettings | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  const theme = parseAwStudioPreset(record['theme'])
  const pointerTrails = record['pointerTrails']
  const trailIntensity = record['trailIntensity']
  if (theme === undefined) return undefined
  if (typeof pointerTrails !== 'boolean') return undefined
  if (typeof trailIntensity !== 'number' || !Number.isFinite(trailIntensity)) return undefined
  if (trailIntensity < AW_STUDIO_TRAIL_INTENSITY_MIN || trailIntensity > AW_STUDIO_TRAIL_INTENSITY_MAX) return undefined
  return { theme, pointerTrails, trailIntensity }
}

/** Every preset id, re-exported for the settings card without duplicating the catalog. */
export { AW_STUDIO_PRESET_IDS }
