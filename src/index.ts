/** AW Studio: aurora appearance, ambient pointer trails, and their settings. */
export { name, apply, Config } from './host/index.ts'
export {
  SETTINGS_NAMESPACE, DEFAULT_AW_STUDIO_SETTINGS, decodeAwStudioSettings,
  AW_STUDIO_TRAIL_INTENSITY_MIN, AW_STUDIO_TRAIL_INTENSITY_MAX,
} from './settings-contract.ts'
export type { AwStudioSettings } from './settings-contract.ts'
export {
  AW_STUDIO_PRESETS, AW_STUDIO_PRESET_IDS, DEFAULT_AW_STUDIO_PRESET, parseAwStudioPreset,
} from './client/presets/catalog.ts'
export type { AwStudioPreset, AwStudioPresetId } from './client/presets/catalog.ts'
