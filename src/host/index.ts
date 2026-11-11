/** AW Studio Host half: declares the appearance configuration; the effects are browser-only. */
import z from '@deepseek-ai/schemastery'
import {
  AW_STUDIO_PRESET_IDS, AW_STUDIO_TRAIL_INTENSITY_MAX, AW_STUDIO_TRAIL_INTENSITY_MIN,
} from '../settings-contract.ts'

export const name = 'dsh-skin'

/** Declared appearance configuration; every field is live-editable from Settings. */
export const Config = z.object({
  theme: z.union(AW_STUDIO_PRESET_IDS).default('aurora'),
  pointerTrails: z.boolean().default(true),
  trailIntensity: z.number().default(0.62),
}).required().volatile()

/**
 * Reject an out-of-range trail intensity at load instead of painting an invalid opacity.
 * @param config - the resolved volatile configuration reference.
 */
export function apply(config: { get?: () => unknown }): void {
  const value = config?.get?.()
  if (typeof value !== 'object' || value === null) return
  const intensity = (value as Record<string, unknown>)['trailIntensity']
  if (typeof intensity === 'number'
    && (intensity < AW_STUDIO_TRAIL_INTENSITY_MIN || intensity > AW_STUDIO_TRAIL_INTENSITY_MAX)) {
    throw new Error('dsh-skin: trailIntensity must be between '
      + AW_STUDIO_TRAIL_INTENSITY_MIN + ' and ' + AW_STUDIO_TRAIL_INTENSITY_MAX)
  }
}
