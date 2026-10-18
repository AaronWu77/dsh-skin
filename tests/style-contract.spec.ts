/** Scoped appearance and rendering-safety checks for the independently loaded skin. */
import { readFileSync } from 'node:fs'
import postcss, { type Root, type Rule } from 'postcss'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const GATE = 'html[data-dsh-skin="aaron"]'
const names = ['theme.css', 'layout.css', 'components.css', 'skin.css'] as const
const sheets = new Map(names.map(name => [name, postcss.parse(
  readFileSync(new URL('../src/client/styles/' + name, import.meta.url), 'utf8'), { from: name },
)]))

/** Keyframe selectors are percentages, not document selectors. */
function keyframe(rule: Rule): boolean {
  let parent: Rule['parent'] | Root['parent'] = rule.parent
  while (parent !== undefined) {
    if (parent.type === 'atrule' && /keyframes$/.test(parent.name)) return true
    parent = parent.parent
  }
  return false
}

function rules(root: Root): Rule[] {
  const found: Rule[] = []
  root.walkRules(rule => { if (!keyframe(rule)) found.push(rule) })
  return found
}

function declarations(sheet: typeof names[number], selector: string): Map<string, string> {
  const matches = rules(sheets.get(sheet)!).filter(rule => rule.selectors.includes(selector))
  if (matches.length === 0) throw new Error('Missing selector: ' + selector)
  return new Map(matches.flatMap(rule => rule.nodes.flatMap(node =>
    node.type === 'decl' ? [[node.prop, node.value.trim().replace(/\s+/g, ' ')] as const] : [])))
}

function prefixOffenders(root: Root): string[] {
  return rules(root).filter(rule => {
    const declarations = rule.nodes.filter(node => node.type === 'decl')
    const prefixed = declarations.findIndex(node => node.prop === '-webkit-backdrop-filter')
    const standard = declarations.findIndex(node => node.prop === 'backdrop-filter')
    if (prefixed === -1 && standard === -1) return false
    return prefixed === -1 || standard === -1 || standard < prefixed
      || declarations[prefixed]!.value !== declarations[standard]!.value
  }).map(rule => rule.selector)
}

const SCROLLBAR_PAIR = new Map([
  ['--dsh-scrollbar-thumb', 'var(--dsw-alias-scrollbar-bg-l2)'],
  ['--dsh-scrollbar-thumb-hover', 'var(--dsw-alias-scrollbar-hover-l2)'],
])

function scrollbarOffenders(root: Root): string[] {
  return rules(root).filter(rule => {
    const entries = rule.nodes.flatMap(node => node.type === 'decl' && SCROLLBAR_PAIR.has(node.prop)
      ? [[node.prop, node.value.trim()] as const] : [])
    if (entries.length === 0) return false
    if (entries.length !== SCROLLBAR_PAIR.size) return true
    const values = new Map(entries)
    return ![...SCROLLBAR_PAIR.keys()].every(property => values.get(property) === 'transparent')
      && ![...SCROLLBAR_PAIR].every(([property, value]) => values.get(property) === value)
  }).map(rule => rule.selector)
}

function ungated(root: Root): string[] {
  return rules(root).flatMap(rule => rule.selectors.filter(selector => !selector.startsWith(GATE)))
}

const component = (selector: string): Map<string, string> => declarations('components.css', GATE + ' ' + selector)

describe('skin stylesheet isolation', () => {
  it('loads only its three local override sheets', () => {
    const imports: string[] = []
    sheets.get('skin.css')!.walkAtRules('import', rule => { imports.push(rule.params) })
    expect(imports).toEqual(['"./theme.css"', '"./layout.css"', '"./components.css"'])
  })

  it('gates every document selector and uses no CSS-module class names', () => {
    expect(ungated(postcss.parse('.unscoped { color: red }'))).toEqual(['.unscoped'])
    expect(ungated(postcss.parse(GATE + ' .md-code-block { color: red }'))).toEqual([])
    for (const [name, root] of sheets) {
      expect(ungated(root), name).toEqual([])
      for (const rule of rules(root)) {
        for (const match of rule.selector.matchAll(/\.([\w-]+)/g)) {
          expect(match[1], name + ': ' + rule.selector).toBe('md-code-block')
        }
        expect(rule.selector, name).not.toMatch(/\[class[\s*^$|~]*=/)
      }
      root.walkAtRules(/keyframes$/, rule => { expect(rule.params).toMatch(/^dsh-skin-/) })
    }
  })

  it('leaves native drag regions, safe clearance, and scrollbar rendering with the host', () => {
    for (const [name, root] of sheets) {
      root.walkDecls(declaration => {
        expect(declaration.prop, name).not.toMatch(/^(?:-webkit-app-region|app-region|--dsh-frame-top-clearance|scrollbar-color|scrollbar-width)$/)
      })
    }
  })
})

describe('backdrop-filter and scrollbar rendering safety', () => {
  it('rejects reversed, incomplete, or unequal prefix pairs', () => {
    expect(prefixOffenders(postcss.parse('.a { backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px) }'))).toEqual(['.a'])
    expect(prefixOffenders(postcss.parse('.a { backdrop-filter: blur(2px) }'))).toEqual(['.a'])
    expect(prefixOffenders(postcss.parse('.a { -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(3px) }'))).toEqual(['.a'])
    expect(prefixOffenders(postcss.parse('.a { -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px) }'))).toEqual([])
  })

  it('keeps every skin filter pair prefixed-first and standard-last', () => {
    let count = 0
    for (const [name, root] of sheets) {
      expect(prefixOffenders(root), name).toEqual([])
      root.walkDecls('backdrop-filter', () => { count += 1 })
    }
    expect(count).toBeGreaterThan(0)
  })

  it('rejects incomplete, mixed, crossed, and modified scrollbar pairs', () => {
    for (const css of [
      '.a { --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2) }',
      '.a { --dsh-scrollbar-thumb: transparent; --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2) }',
      '.a { --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-hover-l2); --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-bg-l2) }',
      '.a { --dsh-scrollbar-thumb: color-mix(in srgb, var(--dsw-alias-scrollbar-bg-l2) 80%, white); --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2) }',
    ]) expect(scrollbarOffenders(postcss.parse(css))).toEqual(['.a'])
    expect(scrollbarOffenders(postcss.parse('.a { --dsh-scrollbar-thumb: transparent; --dsh-scrollbar-thumb-hover: transparent }'))).toEqual([])
  })

  it('keeps complete l2 pairs on the skin-added expanded tool surface', () => {
    for (const [name, root] of sheets) expect(scrollbarOffenders(root), name).toEqual([])
    const expanded = component('[data-dsh-surface="tool-call"][data-expanded]')
    for (const [property, value] of SCROLLBAR_PAIR) expect(expanded.get(property)).toBe(value)
    expect(expanded.get('background')).toBe('var(--dsw-glass-fill)')
  })

  it('keeps blur on the sidebar leaf rather than a fixed-overlay ancestor', () => {
    for (const selector of ['[data-dsh-surface="frame"]', '[data-shell-window]', '[data-dsh-surface="sidebar"]']) {
      const values = declarations('layout.css', GATE + ' ' + selector)
      for (const property of ['backdrop-filter', '-webkit-backdrop-filter', 'filter', 'transform', 'z-index']) {
        expect(values.has(property), selector + ': ' + property).toBe(false)
      }
    }
    const leaf = declarations('layout.css', GATE + ' [data-dsh-part="sidebar-glass"]')
    expect(leaf.get('backdrop-filter')).toBe('var(--dsw-glass-blur)')
    expect(leaf.get('pointer-events')).toBe('none')
  })
})

describe('skin appearance ownership', () => {
  it('keeps the glass and ink token families complete in both palettes', () => {
    const light = declarations('theme.css', GATE + ' body')
    const dark = declarations('theme.css', GATE + ' body[data-ds-dark-theme]')
    const family = (values: Map<string, string>) => [...values.keys()].filter(name => /^--dsw-(?:glass-|aurora-|code-)/.test(name)).sort()
    expect(family(light).length).toBeGreaterThan(0)
    expect(family(dark)).toEqual(family(light))
    expect(light.get('--dsw-alias-markdown-code-block')).toBe('rgba(24, 24, 33, 0.78)')
    expect(dark.get('--dsw-alias-markdown-code-block')).toBe('rgba(12, 12, 18, 0.72)')
    for (const values of [light, dark]) {
      expect(values.get('--dsw-code-ink')).toBe('rgba(233, 236, 244, 0.94)')
      expect(values.get('--dsw-code-ink-secondary')).toBe('rgba(233, 236, 244, 0.76)')
      expect(values.get('--dsw-code-ink-tertiary')).toBe('rgba(233, 236, 244, 0.52)')
      expect(values.get('--dsw-code-link')).toBe('rgb(116, 192, 252)')
    }
  })

  it('uses the readable ink syntax palette on both light and dark body scopes', () => {
    const palette = {
      '--shiki-foreground': 'var(--dsw-code-ink)',
      '--shiki-background': 'var(--dsw-alias-markdown-code-block)',
      '--shiki-token-constant': '#4dabf7', '--shiki-token-string': '#69db7c',
      '--shiki-token-comment': '#adb5bd', '--shiki-token-keyword': '#faa2c1',
      '--shiki-token-parameter': '#ffa94d', '--shiki-token-function': '#b197fc',
      '--shiki-token-string-expression': '#8ce99a', '--shiki-token-punctuation': '#ced4da',
      '--shiki-token-link': '#74c0fc',
    }
    for (const selector of [GATE + ' body', GATE + ' body[data-ds-dark-theme]']) {
      const values = declarations('theme.css', selector)
      for (const [name, value] of Object.entries(palette)) expect(values.get(name), selector + ': ' + name).toBe(value)
    }
  })

  it('recomputes all three elevation shadows per element without pinning its stroke color', () => {
    const values = declarations('theme.css', GATE + ' body *')
    for (const name of ['--dsw-elevation-panel', '--dsw-elevation-prominent', '--dsw-elevation-soft']) {
      expect(values.get(name), name).toMatch(/^var\(--dsw-elevation-stroke\),/)
      expect(values.get(name)?.match(/rgba\(/g), name).toHaveLength(3)
    }
    expect(values.has('--dsw-elevation-stroke-color')).toBe(false)
    expect(declarations('theme.css', GATE + ' body').get('--dsw-mask-blur')).toBe('blur(2px)')
  })

  it('owns the custom radii and retains the workspace-picker stroke exception', () => {
    for (const [selector, radius] of [
      ['[data-dsh-surface="user-bubble"]', '22px'], ['[data-composer-card]', '22px'],
      ['[data-dsh-part="composer-command"]', '9px'], ['[data-dsh-surface="modal"]', '24px'],
    ]) expect(component(selector!).get('border-radius'), selector).toBe(radius)
    expect(component('[data-composer-card]').has('--dsw-elevation-stroke-color')).toBe(false)
    expect(component('[data-composer-card]:not([data-dsh-part="composer-workspace-trigger"])').get('--dsw-elevation-stroke-color'))
      .toBe('var(--dsw-glass-stroke)')
    expect(component('[data-dsh-part="composer-primary"]:hover:not(:disabled)').get('background')).toBe('var(--dsw-brand-gradient)')
  })

  it('rebinds every ink-card family without moving the shared toolbar or JSON toggle', () => {
    const ink = rules(sheets.get('components.css')!).find(rule => rule.nodes.some(node =>
      node.type === 'decl' && node.prop === '--dsw-alias-label-primary' && node.value === 'var(--dsw-code-ink)'))
    expect(ink).toBeDefined()
    for (const selector of ['[data-read]', '[data-diff]', '[data-search]', '[data-terminal]', '[data-web]', '.md-code-block', '[data-dsh-surface="json"]', '[data-dsh-surface="tool-io"]']) {
      expect(ink!.selector).toContain(selector)
    }
    expect(component('.md-code-block > [data-dsh-part="code-banner-wrap"]').get('backdrop-filter')).toBe('var(--dsw-glass-blur-thin)')
    expect(component('[data-web]').get('--dsw-alias-link')).toBe('var(--dsw-code-link)')
    expect(rules(sheets.get('components.css')!).some(rule => rule.selector.includes('[data-code-block-banner]'))).toBe(false)
  })

  it('removes only top-level expanded tool-card margins, not nested Markdown cards', () => {
    const margin = rules(sheets.get('components.css')!).find(rule => rule.nodes.some(node =>
      node.type === 'decl' && node.prop === 'margin' && node.value === '0'))
    expect(margin).toBeDefined()
    const dom = new JSDOM('<html data-dsh-skin="aaron"><body><div data-dsh-surface="tool-call" data-expanded><div><div data-dsh-part="tool-body"><div data-read id="read"></div><div data-dsh-part="tool-code-scroll"><div class="md-code-block" id="code"></div></div><div data-web id="web"><div class="md-code-block" id="nested"></div></div></div></div></div></body></html>')
    try {
      const document = dom.window.document
      for (const id of ['read', 'code', 'web']) expect(document.getElementById(id)!.matches(margin!.selector), id).toBe(true)
      expect(document.getElementById('nested')!.matches(margin!.selector)).toBe(false)
      document.documentElement.removeAttribute('data-dsh-skin')
      expect(document.getElementById('read')!.matches(margin!.selector)).toBe(false)
    } finally {
      dom.window.close()
    }
  })
})
