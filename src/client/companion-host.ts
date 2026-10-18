/** Type-only mirror of the customized Host contract, absent from published RC2 ui-chat.
 * Keep this member identical to the companion Host; it declares no runtime slot.
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'conversation.chat.flow.running.icon': {
      kind: 'single'
      scope: 'session'
      owner: { readonly className: string | undefined }
    }
  }
}
