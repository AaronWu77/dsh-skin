/** Package-local publication and browser import checks. */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'))
assert.equal(pkg.name,'dsh-skin')
assert.equal(pkg.dsh.bundle.patch,'./cordis.patch.yml')
assert.equal(pkg.dsh.client.platform,'web')
assert.equal(pkg.exports['./client'],'./lib/client.js')
const bundle=readFileSync(join(root,'lib/client.js'),'utf8')
assert.match(bundle,/window[.]__ModuleLoader__[.]load/)
const allowed=new Set(['react','react/jsx-runtime'])
for(const match of bundle.matchAll(/require\(["']([^"']+)["']\)/g)) assert.ok(allowed.has(match[1]),'unexpected runtime module '+match[1])
assert.ok(!bundle.includes('ReactCurrentDispatcher'))
for(const name of readdirSync(join(root,'scripts')).filter(n=>n.endsWith('.mjs'))) {
 const check=spawnSync(process.execPath,['--check',join(root,'scripts',name)],{stdio:'inherit'})
 if(check.error) throw check.error
 assert.equal(check.status,0,name+' syntax check')
}
console.log('Package manifest, built browser imports, and script syntax passed')
