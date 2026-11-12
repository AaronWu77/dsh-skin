/** AW Studio Host half: declares the appearance configuration; the effects are browser-only. */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  AW_STUDIO_PRESET_IDS, isTrailIntensity,
} from '../settings-contract.ts'

export const name = 'dsh-skin'

/** Declared appearance configuration; every field is live-editable from Settings. */
export const Config = z.object({
  theme: z.union(AW_STUDIO_PRESET_IDS).default('aurora'),
  pointerTrails: z.boolean().default(true),
  trailIntensity: z.number().default(0.62),
}).required().volatile()

/**
 * Keep legacy configuration loadable and report an invalid initial trail intensity.
 * @param ctx - the Host plugin context.
 * @param config - the resolved volatile configuration reference.
 */
export function apply(ctx: Context, config: { get: () => unknown }): void {
  const value = config.get()
  if (typeof value !== 'object' || value === null) return
  const intensity = (value as Record<string, unknown>)['trailIntensity']
  if (!isTrailIntensity(intensity)) {
    ctx.logger.warn('dsh-skin: invalid trailIntensity; the appearance uses a safe fallback until it is changed in Settings')
  }
}
