/**
 * Palette catalog shared by the theme stylesheet and the pointer-trail canvas.
 * Each preset id matches the `data-aw-theme` value the stylesheet scopes on;
 * the trail colors are the same three brand stops, so the ambience always
 * matches the active palette without a second source of truth.
 */

/** One selectable appearance preset. */
export interface AwStudioPreset {
  /** Display name, already localized by the settings card. */
  readonly label: string
  /** One-line description of the palette's character. */
  readonly description: string
  /** Brand stops in primary, secondary, accent order. */
  readonly trails: readonly [string, string, string]
}

/** Every preset id the stylesheet defines. */
export const AW_STUDIO_PRESETS = {
  aurora: {
    label: "极光 Aurora（现状）",
    description: "紫—粉—蓝三色极光，当前效果",
    trails: ['#8b6bff', '#ff6fb0', '#4a9bff'],
  },
  midnight: {
    label: "午夜 Midnight",
    description: "深空蓝黑 + 青绿冷光，低饱和护眼",
    trails: ['#3c78dc', '#28aab4', '#5a6ee6'],
  },
  ember: {
    label: "余烬 Ember",
    description: "暖橙—琥珀 + 少量玫红，温暖有活力",
    trails: ['#e6783c', '#dc466e', '#f0a032'],
  },
  forest: {
    label: "林雾 Forest",
    description: "墨绿—青苔 + 柔金点缀，沉静自然",
    trails: ['#328c64', '#82a03c', '#28828c'],
  },
  graphite: {
    label: "石墨 Graphite",
    description: "中性灰阶 + 单点冷蓝，极简专业",
    trails: ['#5a6478', '#3c6ebe', '#828c9b'],
  },
} as const satisfies Record<string, AwStudioPreset>

/** One preset id. */
export type AwStudioPresetId = keyof typeof AW_STUDIO_PRESETS

/** Preset ids in presentation order. */
export const AW_STUDIO_PRESET_IDS = Object.keys(AW_STUDIO_PRESETS) as readonly AwStudioPresetId[]

/** Preset used before the user chooses one. */
export const DEFAULT_AW_STUDIO_PRESET: AwStudioPresetId = 'aurora'

/**
 * Narrow an unknown value to a preset id.
 * @param value - candidate read from settings or an attribute.
 * @returns the matching id, or undefined when it names no preset.
 */
export function parseAwStudioPreset(value: unknown): AwStudioPresetId | undefined {
  return typeof value === 'string' && Object.hasOwn(AW_STUDIO_PRESETS, value)
    ? value as AwStudioPresetId
    : undefined
}
