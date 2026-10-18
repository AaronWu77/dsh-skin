/** Existing AW artwork projected through the sidebar's brand slots. */
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

const AW_MARK_PATHS = [
  'M 95 164 L 156 0 H 168 L 277 274 Q 291 306 331 258 L 273 416 H 261 L 158 167 Q 145 111 122 137 Z',
  'M 262 0 H 381 L 492 275 Q 505 305 546 258 L 486 416 H 473 L 326 68 Q 307 17 262 15 Z',
  'M 551 0 H 640 L 607 84 H 592 Q 620 18 551 16 Z',
  'M 32 332 H 47 Q 19 403 92 400 V 416 H 0 Z',
]

/** Render the optical master at the sidebar's personal-brand scale. */
export function BrandMark({ size }: SidebarBrandMarkOwnerProps) {
  const width = size * 7 / 6
  return <svg data-dsh-brand="aw" width={width} height={width * 416 / 640} viewBox="0 0 640 416" fill="none" aria-hidden="true">
    {AW_MARK_PATHS.map(path => <path key={path} d={path} fill="currentColor" />)}
  </svg>
}

/** Fixed brand identifier, identical in every locale. */
const BRAND_NAME = 'STUDIO'

/** Render the independent brand-name slot. */
export function BrandName() {
  return <span data-dsh-brand="studio">{BRAND_NAME}</span>
}
