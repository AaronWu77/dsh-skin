/** Exercise built skin rules against the rc4 layout and component hierarchies, without a profile or server. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import postcss from 'postcss'

const host = resolve(import.meta.dirname, '../../../..')
const readHost = path => readFileSync(resolve(host, path), 'utf8')
const palette = readHost('packages/client/ui-theme/src/styles/design-platform.css')
const frame = readHost('packages/client/ui-layout/src/client/AppFrame.module.css').replace(/:global\(([^)]+)\)/g, '$1')
const artifact = readFileSync(process.argv[2] ?? new URL('../lib/client.js', import.meta.url), 'utf8')
const cssLiteral = artifact.match(/\bvar skin_default = ("(?:[^"\\]|\\.)*");/)?.[1]
assert.ok(cssLiteral, 'the built client embeds the stylesheet')
const css = JSON.parse(cssLiteral)
const sheet = postcss.parse(css)
const rules = []
sheet.walkRules(rule => {
  if (rule.parent.type !== 'atrule' || !rule.parent.name.endsWith('keyframes')) rules.push(rule)
})
for (const { selectors } of rules) {
  for (const selector of selectors) {
    assert.match(selector, /^html\[data-dsh-skin=(?:aaron|"aaron")\]/)
    assert.doesNotMatch(selector, /\[class[\s*^$|~]*=|data-dsh-center-col/)
    for (const [, name] of selector.replace(/\[[^\]]*\]/g, '').matchAll(/\.([\w-]+)/g)) {
      assert.equal(name, 'md-code-block', 'no CSS Module class in ' + selector)
    }
  }
}

// AppFrame uses its production CSS. Other components are reduced to the attributes,
// nesting and competing paint needed by the selectors under test (reports 03 and 04).
const hostStyle = `
  html,body,#root { margin:0; height:100%; }
  body { color:var(--dsw-alias-label-primary); --dsw-elevation-stroke:0 0 0 1px var(--dsw-elevation-stroke-color, var(--dsw-alias-border-l3)); }
  [data-slot] { display:contents; }
  .fixture-sidebar { box-sizing:border-box; height:100%; padding:6px 8px; background:var(--dsw-specific-sidebar-fill); }
  .fixture-sidebar nav { min-height:56px; }
  .fixture-conversation { height:100%; background:var(--dsw-alias-bg-base); }
  .fixture-header { display:flex; align-items:center; box-sizing:border-box; min-height:76px; border-bottom:.5px solid var(--dsw-alias-border-l3); }
  .fixture-hero-header { min-height:40px; border-bottom:none; }
  .fixture-seat { background:linear-gradient(transparent, var(--dsw-alias-bg-base) 36px); }
  .fixture-card { padding:12px; background:var(--dsw-specific-input-major); }
  .fixture-button { background:var(--dsw-alias-button-info-fill); }
  .fixture-button:disabled { opacity:.4; }
  .fixture-button[data-sending]:disabled { opacity:1; }
  .fixture-chip { background:transparent; color:var(--dsw-alias-state-business-primary); }
  .fixture-banner { background:var(--dsw-alias-bg-base); }
  .fixture-glyph { display:inline-flex; width:14px; height:14px; }
  [data-dsh-part="ambient"] { display:none; }
`

function markup({ dark, platform = '', phase = 'active', marked = true, right = false }) {
  const surface = name => marked ? ' data-dsh-surface="' + name + '"' : ''
  const part = name => marked ? ' data-dsh-part="' + name + '"' : ''
  return '<!doctype html><html data-aw-theme="aurora"' + platform + '><body' + (dark ? ' data-ds-dark-theme' : '') + '>' + `
    <div id="root"><div data-slot="root">
      <div id="frame" class="frame" ` + surface('frame') + (right ? '' : ' data-rightbar-collapsed') + `
          style="grid-template-columns:280px minmax(0,1fr) ` + (right ? 320 : 0) + `px">
        <div id="sidebar-col" class="sidebarCol"` + part('sidebar-column') + `>
          <div data-slot="sidebar"><aside id="sidebar" class="fixture-sidebar"` + surface('sidebar') + `>
            <div data-window-drag><span data-dsh-brand="studio">STUDIO</span></div>
            <button type="button">New Session</button><div data-sidebar-scrollport><nav>Sessions</nav></div>
            <div id="footer" data-sidebar-footer><div data-sidebar-footer-actions>User</div></div>
          </aside></div>
        </div>
        <div id="center" class="centerCol"` + surface('center') + `><div class="mainPanel" id="main-panel">
          <div data-slot="main"><div data-slot="main.conversation">
            <div id="conversation" class="fixture-conversation" data-phase="` + phase + '"' + surface('conversation') + `>
              <div data-slot="conversation.header"><header id="topbar" class="fixture-header ` + (phase === 'hero' ? 'fixture-hero-header' : '') + `" data-window-drag>Conversation</header></div>
              <div id="content" data-conversation-content data-content-phase="` + phase + `" data-conversation-region="chat">
                <div data-conversation-scroll>
                  <div id="bubble" data-message-bubble` + surface('user-bubble') + `>User message</div>
                  <div id="tool" data-tool="execute" data-state="running"` + surface('tool-call') + (marked ? ' data-expanded="true"' : '') + `>
                    <span class="fixture-status" hidden>Running tool</span>
                    <div data-open="true"><div data-disclosure-header><div id="disclosure" data-disclosure-row data-expandable role="button" aria-expanded="true">Tool call</div></div>
                      <div id="tool-body"` + part('tool-body') + `>
                        <div id="tool-code"` + part('tool-code-scroll') + `><div id="code" class="md-code-block" data-code-wrap="false">
                          <div id="banner" class="fixture-banner"` + part('code-banner-wrap') + `><div data-code-block-banner>Code banner</div></div>
                          <div data-code-block-content><pre><code>const ready = true</code></pre></div>
                        </div></div>
                        <div id="io"` + surface('tool-io') + `>I/O</div><div id="tool-image"` + part('tool-image') + `>Image</div>
                      </div>
                    </div>
                  </div>
                  <div id="collapsed-tool" data-tool="read" data-state="done"` + surface('tool-call') + `>
                    <div><div data-disclosure-header><div data-disclosure-row aria-expanded="false">Closed tool</div></div></div>
                  </div>
                  <div data-chat-running><span></span><span>
                    <span id="glyph" class="fixture-glyph" aria-hidden="true"` + part('running-glyph') + `><span id="mask"></span><svg id="whale"></svg></span>
                    <span>Deep diving…</span>
                  </span></div>
                  <div id="seat" class="fixture-seat" data-composer-seat data-conversation-region="composer">
                    <div id="composer" class="fixture-card" data-composer-card>
                      <span data-composer-command="goal" contenteditable="false"><span id="command" class="fixture-chip"><span>/goal</span></span></span>
                      <button id="send" class="fixture-button"` + part('composer-primary') + `>Send</button>
                      <button id="disabled" class="fixture-button" disabled` + part('composer-primary') + `>Disabled</button>
                      <button id="sending" class="fixture-button" disabled data-sending` + part('composer-primary') + `>Sending</button>
                    </div>
                    <div id="workspace-trigger" class="fixture-card" data-composer-card` + part('composer-workspace-trigger') + `>Workspace</div>
                  </div>
                </div>
              </div>
            </div>
          </div></div>
        </div></div>
        <div class="rightbarCol" data-rightbar-col></div>
        <div class="bottomRow" data-shell-bottom><div data-slot="shell.bottom"></div></div>
        <div class="overlayLayer" data-shell-overlay></div>
        <div id="sidebar-handle" class="handle" data-side="sidebar" style="left:280px"></div>
        ` + (right ? '<div id="right-handle" class="handle" data-side="rightbar" style="left:880px"></div>' : '') + `
        ` + (marked ? '<div id="ambient" data-dsh-part="ambient" aria-hidden="true"></div>' : '') + `
      </div>
    </div></div>
    <div id="plugin-bar" class="fixture-plugin-bar" data-plugin-bar data-natural>Plugins</div>
    <div id="modal" role="dialog" aria-modal="true"` + surface('modal') + `>Dialog</div>
  </body></html>`
}

const browser = await chromium.launch(process.env.DSH_CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.DSH_CHROMIUM_EXECUTABLE }
  : { channel: process.env.DSH_BROWSER_CHANNEL })
const checks = []
const handles = []
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
  async function mount(options) {
    await page.setContent(markup(options))
    await page.addStyleTag({ content: palette + frame + hostStyle })
    await page.addStyleTag({ content: css })
    await page.addStyleTag({ content: `
      .fixture-plugin-bar[data-natural]::before { content:""; background:var(--dsw-alias-bg-base); }
    ` })
    await page.locator('html').evaluate(el => { el.dataset.dshSkin = 'aaron' })
  }
  const property = (selector, name, pseudo) => page.locator(selector).evaluate((el, [prop, part]) =>
    getComputedStyle(el, part).getPropertyValue(prop).trim(), [name, pseudo ?? null])
  const has = async (selector, name, value, pseudo) => assert.equal(await property(selector, name, pseudo), value, selector + ' ' + name)
  const gradient = async selector => assert.match(await property(selector, 'background-image'), /gradient/, selector)
  const blur = async (selector, size) => assert.match(await property(selector, 'backdrop-filter'), new RegExp('^blur\\(' + size + 'px\\)'), selector)
  const topbar = async () => {
    await has('#topbar', 'background-color', 'rgba(0, 0, 0, 0)')
    await has('#topbar', 'background-image', 'none')
    await has('#topbar', 'backdrop-filter', 'none')
  }
  const handleOffset = (handle, column, edge) => page.evaluate(([handle, column, edge]) => {
    const hit = document.querySelector(handle).getBoundingClientRect()
    const box = document.querySelector(column).getBoundingClientRect()
    return hit.x + hit.width / 2 - box[edge]
  }, [handle, column, edge])
  const fills = []
  for (const dark of [false, true]) {
    await mount({ dark, right: true })
    await gradient('#frame')
    assert.ok(parseFloat(await property('#frame', 'padding-left')) > 0, 'marked frame keeps the rc1 inset')
    await has('#ambient', 'display', 'block')
    await has('#ambient', 'pointer-events', 'none')
    assert.equal((await property('#ambient', 'background-image')).match(/radial-gradient/g)?.length, 5)
    await has('#ambient', 'animation-name', 'dsh-skin-aurora-drift')
    await has('#sidebar', 'background-color', 'rgba(0, 0, 0, 0)')
    await blur('#sidebar-col', 28)
    await has('#footer', 'border-top-style', 'solid')
    await gradient('#center')
    await blur('#center', 44)
    await has('#main-panel', 'background-image', 'none')
    await topbar()
    await has('#topbar', 'border-bottom-style', 'solid')
    const barAtRest = await property('#plugin-bar', 'background-color', '::before')
    assert.notEqual(barAtRest, 'rgb(255, 255, 255)')
    assert.match(await property('#plugin-bar', 'backdrop-filter', '::before'), /^blur\(14px\)/)
    await page.locator('#plugin-bar').evaluate(el => { el.dataset.compact = '' })
    assert.notEqual(await property('#plugin-bar', 'background-color', '::before'), barAtRest)
    await has('#plugin-bar', 'background-color', dark ? 'rgba(30, 31, 36, 0.5)' : 'rgba(255, 255, 255, 0.46)', '::before')
    assert.notEqual(await property('#conversation', 'background-color'), 'rgba(0, 0, 0, 0)')
    await has('#content', 'background-image', 'none')
    await gradient('#seat')
    await has('#composer', 'border-top-left-radius', '22px')
    await blur('#composer', 44)
    fills.push(await property('#composer', 'background-color'))
    assert.notEqual(await property('#composer', '--dsw-elevation-stroke-color'), '')
    await has('#workspace-trigger', '--dsw-elevation-stroke-color', '')
    await has('#command', 'border-top-left-radius', '9px')
    const commandIdle = await property('#command', 'background-color')
    await page.locator('[data-composer-command]').evaluate(el => el.setAttribute('data-selected', ''))
    await page.locator('#command').evaluate(el => el.getAnimations().forEach(animation => animation.finish()))
    assert.notEqual(await property('#command', 'background-color'), commandIdle)
    await gradient('#send')
    await gradient('#sending')
    await has('#disabled', 'background-image', 'none')
    await blur('#tool', 28)
    await has('#tool-body', 'padding-inline-start', '10px')
    await has('#code', 'margin-top', '0px')
    assert.equal(await property('#io', '--dsw-alias-label-primary'), await property('#io', '--dsw-code-ink'))
    await has('#tool-image', 'margin-top', '0px')
    await has('#disclosure', 'animation-name', 'dsh-skin-tool-row-sweep', '::after')
    await has('#collapsed-tool', 'backdrop-filter', 'none')
    await page.locator('#tool').evaluate(el => el.removeAttribute('data-expanded'))
    await blur('#tool', 28)
    await gradient('#bubble')
    await blur('#modal', 44)
    await blur('#banner', 14)
    await has('#mask', 'display', 'none')
    await has('#whale', 'display', 'none')
    await has('#glyph', 'width', '14px')
    await has('#glyph', 'animation-name', 'dsh-skin-running-pulse', '::before')
    for (const width of [1000, 1200, 1440]) {
      await page.setViewportSize({ width, height: 800 })
      await page.locator('#right-handle').evaluate((el, width) => { el.style.left = (width - 320) + 'px' }, width)
      const sidebar = await handleOffset('#sidebar-handle', '#sidebar-col', 'right')
      const rightbar = await handleOffset('#right-handle', '[data-rightbar-col]', 'left')
      assert.ok(Math.abs(sidebar) <= 1 && Math.abs(rightbar) <= 1, 'resize hit area detaches from the inset seam: ' + JSON.stringify({ width, sidebar, rightbar }))
      handles.push({ width, dark, sidebar: +sidebar.toFixed(3), rightbar: +rightbar.toFixed(3) })
    }
    await page.setViewportSize({ width: 1200, height: 800 })
    checks.push('marked ' + (dark ? 'dark' : 'light'))

    await mount({ dark, marked: false, phase: 'hero' })
    await has('#frame', 'padding-left', '0px')
    assert.equal((await property('#frame', 'background-image')).match(/radial-gradient/g)?.length, 5)
    await blur('#sidebar-col', 28)
    await has('#footer', 'border-top-style', 'solid')
    await blur('#main-panel', 44)
    await topbar()
    await has('#topbar', 'border-bottom-style', 'none')
    await has('#conversation', 'background-color', 'rgba(0, 0, 0, 0)')
    await gradient('#content')
    await blur('#composer', 44)
    await blur('#banner', 14)
    await gradient('#bubble')
    assert.equal(await page.locator('#ambient').count(), 0)
    const baseSeat = await property('#seat', 'background-image')
    await page.locator('#content').evaluate(el => { el.dataset.contentPhase = 'active' })
    assert.notEqual(await property('#seat', 'background-image'), baseSeat)
    await page.locator('html').evaluate(el => { delete el.dataset.dshSkin })
    await has('#topbar', 'background-image', 'none')
    checks.push('unmarked hero and active-seat fallback ' + (dark ? 'dark' : 'light'))

    await mount({ dark, platform: ' data-platform="darwin"' })
    const macWash = await property('#sidebar-col', 'background-image')
    assert.match(macWash, /linear-gradient/)
    assert.match(macWash, dark ? /107, 69, 255/ : /179, 160, 255/)
    assert.match(macWash, dark ? /47, 107, 255/ : /147, 201, 255/)
    await has('#sidebar', 'background-color', 'rgba(0, 0, 0, 0)')
    await blur('#center', 44)
    checks.push('macOS wash tokens ' + (dark ? 'dark' : 'light'))
  }
  assert.notEqual(fills[0], fills[1], 'light and dark composer surfaces differ')

  await mount({ dark: false })
  const aurora = await property('#bubble', 'background-image')
  for (const theme of ['midnight', 'ember', 'forest', 'graphite']) {
    await page.locator('html').evaluate((el, theme) => { el.dataset.awTheme = theme }, theme)
    await gradient('#bubble')
    assert.notEqual(await property('#bubble', 'background-image'), aurora)
  }
  checks.push('four alternate bubble palettes')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await has('#ambient', 'animation-name', 'none')
  await has('#glyph', 'animation-name', 'none', '::before')
  await has('#disclosure', 'content', 'none', '::after')
  checks.push('reduced motion')
  await page.emulateMedia({ forcedColors: 'active' })
  assert.notEqual(await property('#whale', 'display'), 'none')
  await has('#glyph', 'content', 'none', '::before')
  checks.push('forced colors use the host whale')
  await page.emulateMedia({ forcedColors: 'none' })
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
    assert.ok(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches))
    for (const [dark, marked] of [[false, true], [true, false]]) {
      await mount({ dark, marked })
      await has(marked ? '#center' : '#main-panel', 'backdrop-filter', 'none')
      await has('#sidebar-col', 'backdrop-filter', 'none')
      await has('#composer', 'backdrop-filter', 'none')
      await topbar()
      await has('#plugin-bar', 'backdrop-filter', 'none', '::before')
      await has('#plugin-bar', 'background-color', 'rgba(0, 0, 0, 0)', '::before')
      await page.locator('#plugin-bar').evaluate(el => { el.dataset.compact = '' })
      assert.match(await property('#plugin-bar', 'background-image', '::before'), /^linear-gradient/)
    }
  } finally { await cdp.detach() }
  checks.push('reduced transparency in marked and unmarked layouts')
  console.log(JSON.stringify({ fixture: 'rc4 DOM and built CSS', rules: rules.length, cssBytes: Buffer.byteLength(css), checks, handles, composerFills: fills }, null, 2))
} finally {
  await browser.close()
}
