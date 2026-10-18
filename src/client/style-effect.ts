/** Per-fiber ownership of the skin's document marker and compiled stylesheet. */
import type { Context } from '@deepseek-ai/cordis'

/** Install owned styles; disposal never rewrites a marker a later owner changed.
 * @param ctx - The client plugin's effect scope.
 * @param css - Compiled, marker-scoped CSS.
 * @param doc - Browser document, injectable for lifecycle tests.
 */
export function installStyles(ctx: Context, css: string, doc: Document = document): void {
  ctx.effect(() => {
    if (doc.querySelector('style[data-dsh-skin-style]') !== null) {
      throw new Error('dsh-skin: a skin stylesheet is already mounted; disable its other Loader entry first')
    }
    const root = doc.documentElement
    const previous = root.getAttribute('data-dsh-skin')
    const style = doc.createElement('style')
    style.dataset.dshSkinStyle = 'aaron'
    style.textContent = css
    doc.head.append(style)
    root.setAttribute('data-dsh-skin', 'aaron')
    return () => {
      style.remove()
      if (root.getAttribute('data-dsh-skin') !== 'aaron') return
      if (previous === null) root.removeAttribute('data-dsh-skin')
      else root.setAttribute('data-dsh-skin', previous)
    }
  })
}
