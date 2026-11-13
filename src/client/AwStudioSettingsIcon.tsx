/** Settings navigation glyph for the AW Studio section. */
import { IconSparkleMedium } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsSectionIconOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client'

/**
 * Declared by the settings shell at runtime. The linked settings package
 * augments its own `@deepseek-ai/dsh-client-ui-slots` copy, so this plugin
 * repeats the seat its renderer types resolve.
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Optional navigation glyph addressed by the matching settings.section id. */
    'settings.section.icon': {
      kind: 'list'
      scope: 'root'
      inline: true
      owner: SettingsSectionIconOwnerProps
    }
  }
}

/**
 * Render the AW Studio navigation glyph.
 * @param props - shell-provided icon size; the glyph keeps the row's text color in both selection states.
 * @returns the section glyph.
 */
export function AwStudioSettingsIcon({ size }: SettingsSectionIconOwnerProps) {
  return <IconSparkleMedium size={size} />
}
