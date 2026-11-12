/** Localized AW Studio settings copy. */
export const en = {
  nav: 'AW Studio',
  appearance: 'AW Studio appearance',
  palette: 'Theme palette',
  paletteDescription: 'Each palette sets the aurora, glass tint, brand gradient and pointer-trail colors together.',
  trails: 'Pointer trails',
  trailsDescription: 'Paint the ambient ribbon behind the frame. It follows the selected palette.',
  intensity: 'Trail strength',
  intensityValue: '{value} × layer opacity',
  refused: 'Could not save this change. Check the settings and try again.',
  invalid: 'Trail strength must be between 0.2 and 1.',
  invalidIntensity: 'Saved trail strength is invalid. The appearance uses {value} until you choose a valid value.',
  restoreIntensity: 'Use default trail strength',
  unknown: 'Could not confirm the change. Values shown may be out of date; reload the page to check.',
  'preset.aurora.label': 'Aurora',
  'preset.aurora.description': 'Purple, pink and blue aurora.',
  'preset.midnight.label': 'Midnight',
  'preset.midnight.description': 'Deep blue and cool teal light.',
  'preset.ember.label': 'Ember',
  'preset.ember.description': 'Warm orange and amber with rose accents.',
  'preset.forest.label': 'Forest',
  'preset.forest.description': 'Deep green, moss and soft gold.',
  'preset.graphite.label': 'Graphite',
  'preset.graphite.description': 'Neutral gray with a cool blue accent.',
} as const

export type SkinLocaleKey = keyof typeof en

export const zh: Record<SkinLocaleKey, string> = {
  nav: 'AW Studio',
  appearance: 'AW Studio 外观',
  palette: '主题配色',
  paletteDescription: '每种配色同时设置极光、玻璃色调、品牌渐变和指针轨迹颜色。',
  trails: '指针轨迹',
  trailsDescription: '在窗口后方绘制随配色变化的环境轨迹。',
  intensity: '轨迹强度',
  intensityValue: '{value} × 图层不透明度',
  refused: '无法保存此次更改，请检查设置后重试',
  invalid: '轨迹强度必须介于 0.2 和 1 之间',
  invalidIntensity: '保存的轨迹强度无效；选择有效值前，外观将使用 {value}',
  restoreIntensity: '使用默认轨迹强度',
  unknown: '无法确认更改是否保存，当前显示的值可能已过期；请刷新页面核对',
  'preset.aurora.label': '极光',
  'preset.aurora.description': '紫、粉、蓝三色极光。',
  'preset.midnight.label': '午夜',
  'preset.midnight.description': '深空蓝与青绿冷光。',
  'preset.ember.label': '余烬',
  'preset.ember.description': '暖橙与琥珀，点缀玫红。',
  'preset.forest.label': '林雾',
  'preset.forest.description': '墨绿、青苔与柔金。',
  'preset.graphite.label': '石墨',
  'preset.graphite.description': '中性灰阶与冷蓝点缀。',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** AW Studio settings labels and status. */
    'dsh-skin': SkinLocaleKey
  }
}
