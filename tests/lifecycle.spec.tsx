// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from './built-renderer.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import * as Skin from '../src/client/index.ts'
import { BrandMark, BrandName } from '../src/client/Brand.tsx'
import { RunningIcon } from '../src/client/RunningIcon.tsx'
import { installStyles } from '../src/client/style-effect.ts'
import { companionHostTypeDiagnostics } from './companion-host-types.ts'

// The primitive is a Host external; test delegation, not its private animation implementation.
// SlotRegistry below is the real published Cordis service, never a mock.
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ StateDot: vi.fn() }))

const ICON = 'conversation.chat.flow.running.icon'
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
  const declare = () => slots.register({ name: 'root', priority: 100, children: {
    'sidebar.brand.mark': { kind: 'single', scope: 'root' },
    'sidebar.brand.name': { kind: 'single', scope: 'root' },
  } }, ({ renderSlot }: PropsRenderSlots<'sidebar.brand.mark' | 'sidebar.brand.name'>) =>
    <>{renderSlot('sidebar.brand.mark', { size: 24 })}{renderSlot('sidebar.brand.name', {})}</>)
  const declareIcon = () => slots.register({ name: 'root', priority: 200, children: {
    [ICON]: { kind: 'single', scope: 'session' },
  } }, ({ renderSlot }: PropsRenderSlots<typeof ICON>) => renderSlot(ICON, { className: 'host-running-icon' }))
  const dispose = declared ? declare() : undefined
  return { ctx, slots, declare, declareIcon, dispose }
}

/** Stand-in identity for the Host's official whale, not a copied component. */
function OfficialWhale() { return null }

/** Read the real registry's selected occupant, not just raw registration count. */
function selected(slots: InstanceType<typeof SlotRegistry>) {
  const node = slots.snapshot(ICON)[0]
  if (!node || node.type !== 'slot') return undefined
  return node.occupants.find(entry => entry.active)?.priority
}

describe('running icon lifecycle', () => {
  it('types production alone and together with the exact companion Host declaration', () => {
    expect(companionHostTypeDiagnostics()).toBe('')
  })

  it.each(['host-running-icon', undefined])('delegates only ongoing state and the owner class (%s) to the shared StateDot', className => {
    const icon = RunningIcon({ className })
    expect(icon.type).toBe(StateDot)
    expect(icon.props).toEqual({ state: 'ongoing', className })
  })

  it('waits for late declarations and follows synchronous disappearance/redeclaration without brands', async () => {
    const b = await bench(false)
    const fiber = b.ctx.plugin(Skin)
    await fiber.await()
    expect(b.slots.entries(ICON)).toHaveLength(0)
    for (let i = 0; i < 3; ++i) {
      const dispose = b.declareIcon()
      expect(b.slots.spec(ICON)).toEqual({ kind: 'single', scope: 'session' })
      expect(b.slots.entries(ICON)).toHaveLength(1)
      expect(b.slots.entries(ICON)[0]?.component).toBe(RunningIcon)
      expect(selected(b.slots)).toBe(-100)
      expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(0)
      dispose()
      dispose()
      expect(b.slots.entries(ICON)).toHaveLength(0)
      expect(b.slots.spec(ICON)).toBeUndefined()
    }
    await fiber.dispose()
    b.declareIcon()
    expect(b.slots.entries(ICON)).toHaveLength(0)
  })

  it.each(['default-first', 'skin-first'] as const)('shadows the priority-100 default and restores it on unload (%s)', async order => {
    const b = await bench(false)
    b.declareIcon()
    const defaultIcon = () => b.slots.register({ name: ICON, priority: 100 }, OfficialWhale)
    if (order === 'default-first') defaultIcon()
    const fiber = b.ctx.plugin(Skin)
    await fiber.await()
    if (order === 'skin-first') defaultIcon()
    expect(b.slots.entries(ICON)).toHaveLength(2)
    expect(selected(b.slots)).toBe(-100)
    expect(b.slots.entries(ICON).find(entry => entry.options.priority === -100)?.component).toBe(RunningIcon)
    await fiber.dispose()
    expect(selected(b.slots)).toBe(100)
    expect(b.slots.entries(ICON)[0]?.component).toBe(OfficialWhale)
  })

  it('keeps icon and brand declaration lifetimes independent in both directions', async () => {
    const b = await bench(false)
    let removeBrands = b.declare()
    let removeIcon = b.declareIcon()
    const fiber = b.ctx.plugin(Skin)
    await fiber.await()
    removeBrands()
    expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    expect(b.slots.entries(ICON)).toHaveLength(1)
    removeBrands = b.declare()
    expect(b.slots.entries('sidebar.brand.name')).toHaveLength(1)
    removeIcon()
    expect(b.slots.entries(ICON)).toHaveLength(0)
    expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(1)
    removeIcon = b.declareIcon()
    expect(b.slots.entries(ICON)).toHaveLength(1)
    await fiber.dispose()
    expect(b.slots.entries(ICON)).toHaveLength(0)
    expect(b.slots.entries('sidebar.brand.name')).toHaveLength(0)
    removeIcon()
    removeBrands()
  })

  it('repeated unloads and declaration removals leave only the Host default, with no revived waiters', async () => {
    const b = await bench(false)
    b.slots.inject(ICON, () => b.slots.register({ name: ICON, priority: 100 }, OfficialWhale))
    let removeIcon = b.declareIcon()
    for (let i = 0; i < 10; ++i) {
      const fiber = b.ctx.plugin(Skin)
      await fiber.await()
      expect(selected(b.slots)).toBe(-100)
      expect(document.querySelectorAll('style[data-dsh-skin-style]')).toHaveLength(1)
      if (i % 2 === 0) { removeIcon(); removeIcon() }
      await fiber.dispose()
      await fiber.dispose()
      expect(document.querySelectorAll('style[data-dsh-skin-style]')).toHaveLength(0)
      if (i % 2 === 0) removeIcon = b.declareIcon()
      expect(b.slots.entries(ICON)).toHaveLength(1)
      expect(selected(b.slots)).toBe(100)
      expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    }
    removeIcon()
    expect(b.slots.entries(ICON)).toHaveLength(0)
    b.declareIcon()
    expect(b.slots.entries(ICON)).toHaveLength(1)
    expect(selected(b.slots)).toBe(100)
  })
})

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
    expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(1)
    dispose()
    expect(b.slots.entries('sidebar.brand.name')).toHaveLength(0)
    b.declare()
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
