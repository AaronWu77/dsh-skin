/** Reversible AW/STUDIO branding and Aurora skin registrations. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { BrandMark, BrandName } from './Brand.tsx'
import { RunningIcon } from './RunningIcon.tsx'
import { installStyles } from './style-effect.ts'
import css from './styles/skin.css?inline'

/** Required runtime service; other feature APIs are type-only. */
export const inject = ['slots']

/** Mount a personal skin without changing application or Session state.
 * @param ctx - Client plugin scope; all contributions leave with it.
 */
export function apply(ctx: Context): void {
  installStyles(ctx, css)
  ctx.slots.inject('conversation.chat.flow.running.icon', () =>
    ctx.slots.register({ name: 'conversation.chat.flow.running.icon', priority: -100 }, RunningIcon))
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark', priority: -100 }, BrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -100 }, BrandName)
    }))
}
