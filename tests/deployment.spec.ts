/** Stopped-service installer preflights must refuse unsafe states before writing. */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
const paths: string[]=[]
afterEach(()=>{for(const path of paths.splice(0))rmSync(path,{recursive:true,force:true})})
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'dsh-skin-deployment-'))
 paths.push(dir)
 const host=join(dir,'host'), home=join(dir,'home')
 mkdirSync(host);mkdirSync(join(home,'profiles/web'),{recursive:true})
 writeFileSync(join(home,'profiles/web/package.json'),JSON.stringify({private:true,dsh:{profile:{bundles:['base','custom']}}}))
 const git=(args:string[])=>{
  const result=spawnSync('git',['-C',host,...args],{encoding:'utf8'})
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(result.stderr)
 }
 git(['init','--initial-branch=main'])
 git(['-c','user.name=Skin fixture','-c','user.email=skin@example.invalid','-c','core.hooksPath=/dev/null','commit','--allow-empty','-m','fixture'])
 git(['config','user.name','Skin fixture'])
 git(['config','user.email','skin@example.invalid'])
 git(['branch','refactor/dsh-skin'])
 return {dir,host,home,git}
}
const powershell=join(process.env.SystemRoot??'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe')
const script=resolve('scripts/install-workspace.ps1')
function run(subject:ReturnType<typeof fixture>,check=true){
 const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'"
 const command="function Get-NetTCPConnection { return @{ OwningProcess=99999 } }; & "+quote(script)+' -HostRoot '+quote(subject.host)+' -DshHome '+quote(subject.home)+(check?' -CheckOnly':'')
 return spawnSync(powershell,['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:20000})
}
function install(subject:ReturnType<typeof fixture>,fail=false){
 const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'"
 const command="function Get-NetTCPConnection {}; function pnpm { Add-Content -LiteralPath "+quote(join(subject.dir,'calls.txt'))+" -Value ($args -join ' '); "+(fail?"$global:LASTEXITCODE=7":"if ($args -contains 'add') { $p="+quote(join(subject.home,'profiles/web/package.json'))+"; $v=Get-Content -Raw $p|ConvertFrom-Json; $v.dsh.profile.bundles+= 'dsh-skin'; $v|ConvertTo-Json -Depth 8|Set-Content $p }; $global:LASTEXITCODE=0")+" }; & "+quote(script)+' -HostRoot '+quote(subject.host)+' -DshHome '+quote(subject.home)
 return spawnSync(powershell,['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:20000})
}
describe.skipIf(process.platform!=='win32')('PowerShell installer safeguards',()=>{
 it('passes the clean descendant preflight without changing a profile',()=>{
  const subject=fixture(),result=run(subject)
  expect(result.error).toBeUndefined()
  expect(result.status,result.stderr).toBe(0)
  expect(result.stdout).toContain('Preflight passed; nothing changed')
  expect(existsSync(join(subject.home,'backups'))).toBe(false)
 })
 it('rejects dirty Host trees before any profile or Git write',()=>{
  const subject=fixture()
  writeFileSync(join(subject.host,'unrelated-edit.txt'),'keep me\n')
  const result=run(subject)
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain('Host has local edits')
  expect(existsSync(join(subject.home,'backups'))).toBe(false)
 })
 it('merges divergent clean histories and preserves the previous revision in its backup',()=>{
  const subject=fixture()
  subject.git(['switch','refactor/dsh-skin'])
  subject.git(['commit','--allow-empty','-m','skin migration'])
  subject.git(['switch','main'])
  subject.git(['commit','--allow-empty','-m','independent customization'])
  const old=spawnSync('git',['-C',subject.host,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()
  const result=install(subject)
  expect(result.error).toBeUndefined()
  expect(result.status,result.stderr).toBe(0)
  const backup=readdirSync(join(subject.home,'backups'))[0]!
  const record=JSON.parse(readFileSync(join(subject.home,'backups',backup,'migration.json'),'utf8').replace(/^\uFEFF/,''))
  expect(record.oldHead).toBe(old)
  const parents=spawnSync('git',['-C',subject.host,'rev-list','--parents','-n','1','HEAD'],{encoding:'utf8'}).stdout.trim().split(' ')
  expect(parents).toHaveLength(3)
  expect(record.migratedHead).toBe(parents[0])
  const manifest=JSON.parse(readFileSync(join(subject.home,'profiles/web/package.json'),'utf8').replace(/^\uFEFF/,''))
  expect(manifest.dsh.profile.bundles).toEqual(['base','custom','dsh-skin'])
 })
 it('stops immediately after a failed install and leaves the profile backed up',()=>{
  const subject=fixture(),result=install(subject,true)
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain('Command failed: pnpm install --frozen-lockfile')
  expect(readFileSync(join(subject.dir,'calls.txt'),'utf8').trim()).toBe('install --frozen-lockfile')
  expect(readdirSync(join(subject.home,'backups'))).toHaveLength(1)
  const manifest=JSON.parse(readFileSync(join(subject.home,'profiles/web/package.json'),'utf8'))
  expect(manifest.dsh.profile.bundles).toEqual(['base','custom'])
 })
 it('refuses to install when the listener is present and never terminates it',()=>{
  const subject=fixture(),result=run(subject,false)
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain('Stop the current Web server first')
  expect(existsSync(join(subject.home,'backups'))).toBe(false)
 })
})
