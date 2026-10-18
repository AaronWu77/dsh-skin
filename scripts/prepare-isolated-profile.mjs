/** Prepare a separate, keyless shipped Web profile; never read the active profile. */
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, readFileSync, cpSync, symlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
const source = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const host = process.env.DSH_HOST_PATH ? resolve(process.env.DSH_HOST_PATH) : resolve(source, '../../../.worktrees/dsh-skin-migration')
if (!existsSync(join(host, 'apps/web/dist/index.html'))) throw new Error('Build the isolated Host before preparing its profile')
mkdirSync(join(source, '.local'), { recursive: true })
const dir = mkdtempSync(join(source, '.local/profile-'))
// Each watcher edits its own source copy, so independent browser runs cannot race a developer or each other.
const plugin=join(dir,'plugin')
mkdirSync(plugin)
for (const name of ['src','lib','package.json','cordis.patch.yml','tsconfig.json','tsdown.config.ts']) cpSync(join(source,name),join(plugin,name),{recursive:true})
symlinkSync(join(source,'node_modules'),join(plugin,'node_modules'),process.platform==='win32'?'junction':'dir')
const profile = join(dir, 'home/profiles/web')
mkdirSync(profile, { recursive: true })
const links = {
 '@deepseek-ai/dsh-base': host + '/packages/bundle/base',
 '@deepseek-ai/dsh-web-app': host + '/packages/bundle/web-app',
}
const extraPaths=JSON.parse(process.env.DSH_SKIN_EXTRA_PLUGIN_PATHS || '[]')
if (!Array.isArray(extraPaths) || extraPaths.some(path=>typeof path!=='string')) throw new Error('DSH_SKIN_EXTRA_PLUGIN_PATHS must be a JSON string array')
const extraPackages=[]
for(const path of extraPaths) {
 const directory=resolve(path)
 const manifest=JSON.parse(readFileSync(join(directory,'package.json'),'utf8'))
 if(typeof manifest.name!=='string' || !manifest.dsh?.bundle?.patch || manifest.name in links) throw new Error('Invalid or duplicate extra plugin bundle: '+directory)
 links[manifest.name]=directory
 extraPackages.push(manifest.name)
}
writeFileSync(join(profile, 'package.json'), JSON.stringify({ name: 'skin-isolated-web', private: true, type: 'module', dependencies: Object.fromEntries(Object.entries(links).map(([k,v]) => [k, 'link:' + v.replaceAll('\\', '/')])), dsh: { profile: { bundles: Object.keys(links), patchReload: 'live' } } }, null, 2))
writeFileSync(join(profile, 'cordis.yml'), '[]\n')
// Skin acceptance uses an already-acknowledged onboarding fixture, not the unrelated settings-write flow.
const notice=readFileSync(join(host,'packages/client/ui-settings-models/src/onboarding-copy.ts'),'utf8').match(/WELCOME_NOTICE_VERSION = '([^']+)'/)?.[1]
if (!notice) throw new Error('update the onboarding fixture for this Host version')
const onboarding='- id: ui-settings-general\n  config:\n    welcomeNoticeVersion: '+JSON.stringify(notice)+'\n'
writeFileSync(join(profile, 'cordis.patch.yml'), onboarding)
writeFileSync(join(profile, 'pnpm-workspace.yaml'), 'packages: []\n')
const pnpm = join(host, 'node_modules/pnpm/bin/pnpm.cjs')
if (!existsSync(pnpm)) throw new Error('Install the Host workspace dependencies first')
const result = spawnSync(process.execPath, [pnpm, 'install', '--ignore-scripts'], { cwd: profile, stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) throw new Error('isolated profile installation failed')
const req=createRequire(join(host,'package.json'))
const add=spawnSync(process.execPath,['--import',pathToFileURL(req.resolve('tsx/esm')).href,join(host,'apps/cli/src/bin.ts'),'plugin','--profile','web','add','link:'+plugin.replaceAll('\\','/')],{cwd:dir,env:{...process.env,DSH_HOME:join(dir,'home'),TSX_TSCONFIG_PATH:join(host,'tsconfig.json')},stdio:'inherit'})
if(add.error) throw add.error
if(add.status!==0) throw new Error('official profile plugin add failed')
for(const directory of extraPaths) {
 const extra=spawnSync(process.execPath,['--import',pathToFileURL(req.resolve('tsx/esm')).href,join(host,'apps/cli/src/bin.ts'),'plugin','--profile','web','add','link:'+resolve(directory).replaceAll('\\','/')],{cwd:dir,env:{...process.env,DSH_HOME:join(dir,'home'),TSX_TSCONFIG_PATH:join(host,'tsconfig.json')},stdio:'inherit'})
 if(extra.error) throw extra.error
 if(extra.status!==0) throw new Error('official extra plugin add failed: '+directory)
}
export const fixture={ dir, profile, host, plugin, onboarding, extraPackages, home: join(dir,'home') }
writeFileSync(join(dir,'fixture.json'),JSON.stringify(fixture,null,2))
console.log('Prepared isolated profile (no credentials or production data): ' + dir)
