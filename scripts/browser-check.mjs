/** Real Loader/profile + browser acceptance on an OS-assigned port and fresh home. */
import { readFileSync, writeFileSync, openSync, closeSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { fixture } from './prepare-isolated-profile.mjs'

const { dir, profile, host, home, plugin, onboarding, extraPackages } = fixture
const require = createRequire(join(host,'package.json'))
const logPath = join(dir,'host.log')
const log = openSync(logPath,'w')
const env = { ...process.env, DSH_HOME: home, DSH_AGENTS_HOME: join(dir,'agents'), TSX_TSCONFIG_PATH: join(host,'tsconfig.json'), DEEPSEEK_API_KEY: 'skin-keyless-no-call' }
for (const key of Object.keys(env)) if (/^(OPENAI|ANTHROPIC|DEEPSEEK)_/.test(key) && key !== 'DEEPSEEK_API_KEY') delete env[key]
const pickerArgs = extraPackages.includes('dsh-remote-ssh') ? [] : ['--patch', join(host,'apps/web/tests/pin-browse-picker.overlay.yml')]
const child = spawn(process.execPath, ['--import', pathToFileURL(require.resolve('tsx/esm')).href, join(host,'apps/cli/src/bin.ts'), 'web', ...pickerArgs, '--no-open', '--port','0'], { cwd: dir, env, stdio: ['ignore',log,log] })
let browser
let page
let watcher
let originalSkin
const skinPath=join(plugin,'src/client/styles/skin.css')
const errors=[]
const report={checks:[],origin:null,diagnostics:dir,extraPackages}
try {
  let launchUrl
  const deadline=Date.now()+120000
  while (Date.now()<deadline) {
    if (child.exitCode !== null) throw new Error('test Host exited: '+readFileSync(logPath,'utf8').slice(-6000))
    const text=readFileSync(logPath,'utf8')
    launchUrl=text.match(new RegExp('http://127[.]0[.]0[.]1:[0-9]+/[?]token=[A-Za-z0-9_-]+'))?.[0]
    if (launchUrl) break
    await delay(100)
  }
  if (!launchUrl) throw new Error('Host readiness timeout; inspect '+logPath)
  report.origin=new URL(launchUrl).origin
  assert.notEqual(new URL(launchUrl).port,'3080')
  browser=await chromium.launch({ headless:true, channel: process.env.DSH_BROWSER_CHANNEL || 'chrome' })
  page=await browser.newPage({ viewport:{width:1440,height:1000}, locale:'en-US', reducedMotion:'reduce' })
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(launchUrl)
  await page.locator('html[data-dsh-skin="aaron"]').waitFor({timeout:45000})
  await page.locator('[data-dsh-brand="studio"]').waitFor({state:'attached',timeout:45000})
  assert.equal(await page.locator('style[data-dsh-skin-style]').count(),1)
  await page.getByRole('button',{name:'Continue',exact:true}).waitFor({state:'hidden',timeout:30000})
  await page.getByText('Default workspace',{exact:true}).first().waitFor({state:'visible',timeout:45000})
  report.checks.push('shipped Web profile discovers and mounts built dsh-skin')
  if (extraPackages.includes('dsh-remote-ssh')) report.checks.push('remote-ssh supplies its own directory picker without the browse overlay')
  const palette=async dark=>page.evaluate(dark=>{
    document.body.toggleAttribute('data-ds-dark-theme',dark)
    const css=getComputedStyle(document.body)
    return { ink:css.getPropertyValue('--dsw-code-ink').trim(),fill:css.getPropertyValue('--dsw-glass-fill').trim(),keyword:css.getPropertyValue('--shiki-token-keyword').trim() }
  },dark)
  const light=await palette(false),dark=await palette(true)
  assert.notEqual(light.fill,dark.fill)
  assert.equal(light.ink,dark.ink)
  assert.equal(light.keyword,dark.keyword)
  assert.ok(light.ink.length>0)
  report.checks.push('light/dark glass and shared readable code palette')
  await page.screenshot({path:join(dir,'enabled-dark.png'),fullPage:true})
  await palette(false)
  await page.screenshot({path:join(dir,'enabled-light.png'),fullPage:true})
  for (const width of [360,720,1440]) {
    await page.setViewportSize({width,height:1000})
    const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}))
    assert.ok(geometry.width<=geometry.viewport,'skin viewport overflow at '+width)
  }
  await palette(true)
  report.checks.push('light/dark screenshots and 360/720/1440px viewport overflow checks')
  // The file watcher is the real Host graph update source; no page reload.
  const patch=join(profile,'cordis.patch.yml')
  writeFileSync(patch,onboarding+'- id: dsh-skin\n  disabled: true\n')
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-dsh-skin'),undefined,{timeout:30000})
  assert.equal(await page.locator('style[data-dsh-skin-style]').count(),0)
  assert.equal(await page.locator('[data-dsh-brand="studio"]').count(),0)
  report.checks.push('Host patch disables brand slots and owned CSS without page reload')
  await page.screenshot({path:join(dir,'disabled.png'),fullPage:true})
  writeFileSync(patch,onboarding+'- id: dsh-skin\n  disabled: false\n')
  await page.waitForFunction(()=>document.documentElement.getAttribute('data-dsh-skin')==='aaron', undefined,{timeout:30000})
  await page.locator('[data-dsh-brand="studio"]').waitFor({state:'attached'})
  assert.equal(await page.locator('style[data-dsh-skin-style]').count(),1)
  report.checks.push('Host patch re-enables skin without duplicate CSS')
  const pluginRequire=createRequire(join(plugin,'package.json'))
  watcher=spawn(process.execPath,[pluginRequire.resolve('tsdown/run'),'--watch'],{cwd:plugin,stdio:['ignore',log,log]})
  const buildDeadline=Date.now()+30000
  while (!readFileSync(logPath,'utf8').includes('Watching for changes') && Date.now()<buildDeadline) {
    if (watcher.exitCode!==null) throw new Error('skin watcher exited before readiness')
    await delay(100)
  }
  originalSkin=readFileSync(skinPath,'utf8')
  writeFileSync(skinPath,originalSkin+'\nhtml[data-dsh-skin="aaron"] { --dsh-skin-hmr-probe: 1; }\n')
  await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--dsh-skin-hmr-probe').trim()==='1',undefined,{timeout:45000})
  assert.equal(await page.locator('style[data-dsh-skin-style]').count(),1)
  writeFileSync(skinPath,originalSkin)
  await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--dsh-skin-hmr-probe').trim()==='',undefined,{timeout:45000})
  report.checks.push('source edit -> independent watch build -> actual browser HMR, without page reload')
  const scroll=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}))
  assert.ok(scroll.width<=scroll.viewport)
  assert.deepEqual(errors,[])
  writeFileSync(join(dir,'browser-result.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
} catch(error) {
  console.error('Isolated profile diagnostics: '+dir)
  if (page) { await page.screenshot({path:join(dir,'failure.png'),fullPage:true}); writeFileSync(join(dir,'page-errors.json'),JSON.stringify({errors,text:await page.locator('body').innerText()},null,2)) }
  throw error
} finally {
  if (originalSkin !== undefined) writeFileSync(skinPath,originalSkin)
  try {
    if (browser) await browser.close()
  } finally {
    try { await stop(watcher) } finally { await stop(child) }
  }
  closeSync(log)
}
async function stop(process) {
  if (!process || process.exitCode!==null || process.signalCode!==null) return
  const closed=once(process,'close')
  const force=setTimeout(()=>process.kill('SIGKILL'),15000)
  process.kill()
  try { await closed } finally { clearTimeout(force) }
}
