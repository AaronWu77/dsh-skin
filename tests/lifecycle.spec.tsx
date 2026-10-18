// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from './built-renderer.ts'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import * as Skin from '../src/client/index.ts'
import { BrandMark, BrandName } from '../src/client/Brand.tsx'
import { installStyles } from '../src/client/style-effect.ts'

const roots: Context[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await root.fiber.dispose()
  cleanup()
  document.documentElement.removeAttribute('data-dsh-skin')
  document.querySelectorAll('style[data-dsh-skin-style]').forEach(style => style.remove())
})
async function bench(declared = true) {
  const ctx = new Context()
  roots.push(ctx)
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots')
  if (!slots) throw new Error('SlotRegistry failed to activate')
  const declare = () => slots.register({ name: 'root', children: {
    'sidebar.brand.mark': { kind: 'single', scope: 'root' },
    'sidebar.brand.name': { kind: 'single', scope: 'root' },
  } } as never, () => null)
  const dispose = declared ? declare() : undefined
  return { ctx, slots, declare, dispose }
}

describe('skin registration lifecycle', () => {
  it('renders the same optical AW master and fixed STUDIO identifier', () => {
    const mark = render(<BrandMark size={24} />)
    expect(mark.container.querySelector('svg')?.getAttribute('width')).toBe('28')
    expect(mark.container.querySelectorAll('path')).toHaveLength(4)
    const name = render(<BrandName />)
    expect(name.getByText('STUDIO')).toBeTruthy()
  })
  it('loads before declarations, follows redeclaration, and removes all registrations', async () => {
    const b = await bench(false)
    const fiber = b.ctx.plugin(Skin)
    await fiber.await()
    expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    const dispose = b.declare()
    await Promise.resolve()
    expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(1)
    dispose()
    expect(b.slots.entries('sidebar.brand.name')).toHaveLength(0)
    b.declare()
    await Promise.resolve()
    expect(b.slots.entries('sidebar.brand.name')).toHaveLength(1)
    await fiber.dispose()
    expect(b.slots.entries('sidebar.brand.name')).toHaveLength(0)
    expect(document.querySelector('style[data-dsh-skin-style]')).toBeNull()
    expect(document.documentElement.hasAttribute('data-dsh-skin')).toBe(false)
  })
  it('repeated loads keep one stylesheet and leave no residue', async () => {
    const b = await bench()
    for (let i = 0; i < 10; ++i) {
      const fiber = b.ctx.plugin(Skin)
      await fiber.await()
      expect(document.querySelectorAll('style[data-dsh-skin-style]')).toHaveLength(1)
      expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(1)
      await fiber.dispose()
      expect(document.querySelectorAll('style[data-dsh-skin-style]')).toHaveLength(0)
      expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    }
  })
  it('restores a previous marker but preserves a later owner', async () => {
    const b = await bench()
    document.documentElement.setAttribute('data-dsh-skin', 'previous')
    const first = b.ctx.plugin({ apply: c => installStyles(c, '') })
    await first.await()
    await first.dispose()
    expect(document.documentElement.getAttribute('data-dsh-skin')).toBe('previous')
    const second = b.ctx.plugin({ apply: c => installStyles(c, '') })
    await second.await()
    document.documentElement.setAttribute('data-dsh-skin', 'later')
    await second.dispose()
    expect(document.documentElement.getAttribute('data-dsh-skin')).toBe('later')
  })
  it('rejects a second mounted stylesheet without removing the first owner', async () => {
    const b = await bench()
    installStyles(b.ctx, '/* first */')
    const other = new Context()
    roots.push(other)
    expect(() => installStyles(other, '/* second */')).toThrow(/already mounted/)
    expect(document.querySelector('style[data-dsh-skin-style]')?.textContent).toBe('/* first */')
  })
})
