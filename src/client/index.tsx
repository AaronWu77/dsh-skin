/**
 * AW Studio client half: the aurora appearance, the optional ambient pointer
 * trails, and the Settings card that drives both.
 *
 * The appearance is one attribute pair on `<html>`: `data-dsh-skin` scopes the
 * stylesheet and `data-aw-theme` selects the palette, so removing this plugin
 * restores the harness look without touching any other contribution.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { AW_STUDIO_PRESETS } from './presets/catalog.ts'
import type { AwStudioPresetId } from './presets/catalog.ts'
import { mountPointerTrails } from './trails/engine.ts'
import { BrandMark, BrandName } from './Brand.tsx'
import { RunningIcon } from './RunningIcon.tsx'
import { installStyles } from './style-effect.ts'
import { AwStudioSettingsCard } from './settings/AwStudioSettingsCard.tsx'
import {
  DEFAULT_AW_STUDIO_SETTINGS, decodeAwStudioSettings, SETTINGS_NAMESPACE,
} from '../settings-contract.ts'
import type { AwStudioSettings } from '../settings-contract.ts'
import type { ConfigForms } from '@deepseek-ai/dsh-client-ui-settings/client'

/**
 * Declared by the settings shell at runtime. The linked settings package
 * augments Context against its own Cordis copy, so the service is repeated
 * here for this plugin's Context to type check.
 */
declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Shared configuration-form registry and its Host describe mirror. */
    configForms: ConfigForms
  }
}

import css from './styles/skin.css?inline'

/** Required client services: slots renders the appearance, configForms carries its settings. */
export const inject = ['slots', 'configForms']

/** Appearance used while the Host has not answered the first settings read. */
const FALLBACK: AwStudioSettings = DEFAULT_AW_STUDIO_SETTINGS

/**
 * Mount the appearance, the ambience, and the Settings card.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: Context): void {
  installStyles(ctx, css)

  const form = ctx.configForms.get<AwStudioSettings>(SETTINGS_NAMESPACE)
  const snapshot = (): AwStudioSettings => decodeAwStudioSettings(form.getSnapshot().value) ?? FALLBACK
  const root = document.documentElement

  // The ambience restarts on a palette or intensity change without re-installing styles.
  let disposeTrails: (() => void) | undefined
  let applied: AwStudioSettings | undefined
  const render = (settings: AwStudioSettings): void => {
    root.setAttribute('data-aw-theme', settings.theme)
    const unchanged = applied !== undefined
      && applied.theme === settings.theme
      && applied.pointerTrails === settings.pointerTrails
      && applied.trailIntensity === settings.trailIntensity
    if (unchanged) return
    applied = settings
    disposeTrails?.()
    disposeTrails = settings.pointerTrails
      ? mountPointerTrails(ctx, () => ({ preset: settings.theme, intensity: settings.trailIntensity }))
      : undefined
  }
  render(snapshot())
  ctx.effect(() => form.subscribe(() => { render(snapshot()) }), 'dsh-aw-studio: follow settings')
  ctx.effect(() => () => { disposeTrails?.() }, 'dsh-aw-studio: trails teardown')

  // Brand and the running glyph keep the harness's existing slot contracts.
  ctx.slots.inject('conversation.chat.flow.running.icon', () =>
    ctx.slots.register({ name: 'conversation.chat.flow.running.icon', priority: -100 }, RunningIcon))
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark', priority: -100 }, BrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -100 }, BrandName)
    }))

  // The page is a first-class Settings section, and exists only while the Host serves it.
  ctx.effect(() => ctx.configForms.whileServed([SETTINGS_NAMESPACE], () => ctx.slots.register({
    name: 'settings.section',
    id: 'aw-studio',
    order: 22,
    label: () => 'AW Studio',
    inject: () => ({
      presets: Object.entries(AW_STUDIO_PRESETS).map(([id, preset]) => ({ id: id as AwStudioPresetId, ...preset })),
      current: snapshot,
      setTheme: async (theme: AwStudioPresetId) => { await form.set('theme', theme) },
      setPointerTrails: async (pointerTrails: boolean) => { await form.set('pointerTrails', pointerTrails) },
      setTrailIntensity: async (trailIntensity: number) => { await form.set('trailIntensity', trailIntensity) },
    }),
  }, AwStudioSettingsCard)), 'dsh-aw-studio: settings page while served')
}
