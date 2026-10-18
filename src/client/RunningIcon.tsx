/** Decorative glyph only; Chat retains running state, clock, copy, and announcements. */
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { OwnerOf } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './companion-host.ts'

/** Reuse the Host's shared spinner and layout class without a second activity lifecycle. */
export function RunningIcon({ className }: OwnerOf<'conversation.chat.flow.running.icon'>) {
  return <StateDot state="ongoing" className={className} />
}
