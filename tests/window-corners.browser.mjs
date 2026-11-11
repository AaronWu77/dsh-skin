/** Browser geometry checks against the companion Host's actual layout sheets; no server or profile. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const host = process.env.DSH_HOST_PATH || resolve(import.meta.dirname, '../../../..')
const source = path => readFileSync(resolve(host, path), 'utf8')
const moduleCss = path => source(path).replace(/:global\(([^)]+)\)/g, '$1')
const skin = name => readFileSync(new URL('../src/client/styles/' + name, import.meta.url), 'utf8')
const builtMode = process.argv.includes('--built')
const sheets = moduleCss('packages/client/ui-layout/src/client/AppFrame.module.css')
  + moduleCss('packages/client/ui-sidebar-right/src/client/shell/SidebarRight.module.css')
  + moduleCss('packages/client/ui-sidebar/src/client/SidebarRoot.module.css')
  + source('packages/client/ui-theme/src/styles/corner-shape.css') + (builtMode ? '' : skin('theme.css') + skin('layout.css'))
const built = builtMode ? readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8') : ''
const browser = await chromium.launch({ channel: process.env.DSH_BROWSER_CHANNEL || 'chrome' })
const results = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  async function mount({ width = 1440, dark = false, platform = '', collapsed = false, drawer = false, right = false, fullscreen = false, bottom = 'empty' } = {}) {
    await page.setViewportSize({ width, height: 900 })
    const leftWidth = drawer || collapsed && platform ? 0 : collapsed ? 56 : 280
    await page.setContent('<html data-dsh-skin="aaron"' + (platform === 'mac' ? ' data-platform="darwin"' : platform === 'win' ? ' data-windows-titlebar' : '') + '><head><style>'
      + 'html,body{margin:0;height:100%;--dsh-windows-titlebar-height:32px;--dsw-alias-bg-base:#fff;--dsw-specific-sidebar-fill:#eee} [hidden]{display:none!important} .paint{height:100%;background:#5588cc;pointer-events:auto} .float{position:fixed;left:100px;top:400px;width:100px;height:100px;background:#c55;pointer-events:auto} .bottom-content{height:200px}'
      + sheets + '</style></head><body' + (dark ? ' data-ds-dark-theme' : '') + '><div class="frame" data-dsh-surface="frame"'
      + (collapsed ? ' data-sidebar-collapsed' : '') + (drawer ? ' data-sidebar-drawer' : '') + (!right ? ' data-rightbar-collapsed' : '')
      + (fullscreen ? ' data-rightbar-fullscreen' : '')
      + ' style="grid-template-columns:' + leftWidth + 'px minmax(0,1fr) ' + (right ? 400 : 0) + 'px">'
      + '<div class="sidebarCol" data-dsh-part="sidebar-column"' + (drawer ? ' style="width:280px"' : '') + '><div data-slot="sidebar" style="display:contents"><div class="root" data-dsh-surface="sidebar"><div class="paint" id="sidebar-paint"></div></div></div></div>'
      + '<div class="centerCol" data-dsh-surface="center"><div class="paint" id="center-paint"></div></div>'
      + '<div class="rightbarCol" data-rightbar-col><div class="session"><div class="panel" data-sidebar-right-panel="' + (fullscreen ? 'fullscreen' : 'push') + '"'
      + (right || fullscreen ? ' data-sidebar-right-open' : '') + ' style="width:' + (fullscreen ? '100vw' : '400px') + '">'
      + (right || fullscreen ? '<div class="paint" id="right-paint" style="width:100%"></div>' : '') + '<div class="float" id="floating"></div></div></div></div>'
      + '<div class="bottomRow" data-shell-bottom><div data-slot="shell.bottom" style="display:contents">'
      + (bottom === 'empty' ? '' : '<section class="bottom-content" id="bottom-paint"' + (bottom === 'hidden' ? ' hidden' : '') + '>Bottom</section>')
      + '</div></div></div></body></html>')
    if (builtMode) {
      await page.evaluate(() => {
        window.__ModuleLoader__ = { load(record) {
          const skin = record.factory(name => {
            if (name === 'react/jsx-runtime') return { jsx: () => null }
            throw new Error('Unexpected skin dependency: ' + name)
          })
          skin.apply({ effect: fn => fn(), slots: { inject: () => () => {} } })
        } }
      })
      await page.addScriptTag({ content: built })
    }
  }
  const radii = selector => page.locator(selector).evaluate(el => {
    const s = getComputedStyle(el)
    return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map(parseFloat)
  })
  const clipped = (selector, corner, paint) => page.locator(selector).evaluate((el, {corner, paint}) => {
    const r = el.getBoundingClientRect()
    const x = corner.endsWith('r') ? r.right - 1 : r.left + 1
    const y = corner.startsWith('b') ? r.bottom - 1 : r.top + 1
    return document.elementFromPoint(x,y)?.id !== paint
  }, {corner, paint})
  const cases = [
    ['web expanded', {}], ['web rail', {collapsed:true}],
    ['mobile drawer closed', {width:390,drawer:true,collapsed:true}],
    ['mac hidden', {platform:'mac',collapsed:true}], ['Windows hidden', {platform:'win',collapsed:true}],
    ['right open', {right:true}], ['Windows three columns', {platform:'win',right:true}],
    ['bottom visible', {right:true,bottom:'visible'}], ['bottom retained hidden', {bottom:'hidden'}],
  ]
  for (const dark of [false,true]) for (const [label, options] of cases) {
    await mount({...options,dark})
    assert.deepEqual(await radii('[data-dsh-surface="frame"]'),[0,0,0,0],label + ': canvas stays square')
    assert.equal(await page.locator('[data-dsh-surface="frame"]').evaluate(el=>getComputedStyle(el).boxShadow),'none',label + ': no outer window shadow')
    assert.deepEqual(await radii('[data-dsh-surface="sidebar"]'),await radii('[data-dsh-part="sidebar-column"]'),label + ': sidebar paint and column share the curve')
    const center = await radii('[data-dsh-surface="center"]')
    const leftExposed = options.drawer || options.collapsed && options.platform
    const hasBottom = options.bottom === 'visible'
    const radius = await page.locator('[data-dsh-part="sidebar-column"]').evaluate(el=>parseFloat(getComputedStyle(el).borderTopLeftRadius))
    assert.deepEqual(center, [leftExposed?radius:0, options.right?0:radius, options.right||hasBottom?0:radius, leftExposed&&!hasBottom?radius:0], label)
    if (leftExposed) assert.ok(await clipped('[data-dsh-surface="center"]','tl','center-paint'), label + ': center left clips')
    else assert.ok(await clipped('[data-dsh-part="sidebar-column"]','tl','sidebar-paint'), label + ': sidebar left clips')
    if (options.right) {
      assert.deepEqual(await radii('[data-sidebar-right-panel]'), [0,radius,hasBottom?0:radius,0], label + ': actual right panel')
      assert.ok(await clipped('[data-sidebar-right-panel]','tr','right-paint'), label + ': right content clips')
      assert.equal(await page.locator('[data-rightbar-col]').evaluate(el=>getComputedStyle(el).overflow), 'visible')
    } else assert.ok(await clipped('[data-dsh-surface="center"]','tr','center-paint'),label + ': center right clips')
    if (hasBottom) {
      assert.equal((await radii('[data-dsh-part="sidebar-column"]'))[3],0,label + ': row seam square')
      assert.deepEqual(await radii('[data-shell-bottom]'),[0,0,radius,radius],label + ': bottom rounds')
      assert.ok(await clipped('[data-shell-bottom]','br','bottom-paint'),label + ': bottom content clips')
    }
    assert.equal(await page.locator('#floating').evaluate(el => {
      const r=el.getBoundingClientRect(); return r.x===100 && r.y===400 && document.elementFromPoint(150,450)===el
    }),true,label + ': fixed pane escapes zero-width/right column')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label + ': viewport overflow')
    results.push(label + (dark?' dark':' light'))
  }
  for (const dark of [false,true]) {
    await mount({dark})
    const sidebar = page.locator('[data-dsh-surface="sidebar"]')
    await sidebar.evaluate(el => el.replaceChildren())
    const box = await sidebar.boundingBox()
    const clip = {x:0,y:0,width:100,height:100}
    const painted = await page.screenshot({clip})
    await sidebar.evaluate(el => { el.style.visibility = 'hidden' })
    const canvas = await page.screenshot({clip})
    const samples = [[2,2],[6,2],[2,6],[6,6]].map(([x,y])=>[Math.round(box.x+x),Math.round(box.y+y)])
    const differences = await page.evaluate(async ({painted,canvas,samples}) => {
      const read = async data => {
        const image = new Image()
        image.src = 'data:image/png;base64,' + data
        await image.decode()
        const surface = document.createElement('canvas')
        surface.width=image.width; surface.height=image.height
        const context=surface.getContext('2d')
        context.drawImage(image,0,0)
        return samples.map(([x,y])=>Array.from(context.getImageData(x,y,1,1).data))
      }
      const [a,b] = await Promise.all([read(painted),read(canvas)])
      return a.map((rgba,i)=>Math.max(...rgba.map((channel,c)=>Math.abs(channel-b[i][c]))))
    }, {painted:painted.toString('base64'),canvas:canvas.toString('base64'),samples})
    assert.ok(differences.every(value=>value<=1),'sidebar glass must not tint pixels outside the inner curve: '+JSON.stringify({dark,differences}))
    results.push('sidebar corner pixels ' + (dark?'dark':'light'))
  }
  await mount({fullscreen:true,right:true})
  assert.deepEqual(await radii('[data-sidebar-right-panel]'),[0,0,0,0],'fullscreen does not inherit inner radius')
  assert.equal(await page.locator('[data-sidebar-right-panel]').evaluate(el=>{const r=el.getBoundingClientRect();return r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight}),true,'fullscreen remains viewport anchored')
  results.push('fullscreen viewport')
  await mount({width:390,drawer:true})
  const drawerBox=await page.locator('[data-dsh-part="sidebar-column"]').boundingBox()
  assert.ok(drawerBox.x>0&&drawerBox.y>0&&drawerBox.y+drawerBox.height<900,'drawer remains within decorative inset')
  assert.ok(await clipped('[data-dsh-part="sidebar-column"]','br','sidebar-paint'),'drawer rounds exposed right corner')
  assert.deepEqual(await radii('[data-dsh-surface="sidebar"]'),await radii('[data-dsh-part="sidebar-column"]'),'drawer paint shares all four corner radii')
  results.push('drawer open')
  await page.locator('html').evaluate(el=>el.removeAttribute('data-dsh-skin'))
  assert.deepEqual(await radii('[data-dsh-surface="center"]'),[0,0,0,0],'unload removes skin rounding')
  console.log(JSON.stringify({mode:builtMode?'built':'source',passed:results.length+1,cases:[...results,'skin unload']},null,2))
} finally { await browser.close() }
