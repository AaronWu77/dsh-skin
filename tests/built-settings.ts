/** Evaluate the installed settings provider's browser factory for synthetic composition tests. */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import type { apply as SettingsApply } from '@deepseek-ai/dsh-client-ui-settings/client'

const require = createRequire(import.meta.url)
const filename = require.resolve('@deepseek-ai/dsh-client-ui-settings/client')
const settingsRequire = createRequire(filename)
let apply: typeof SettingsApply | undefined
runInNewContext(readFileSync(filename, 'utf8'), {
  window: { __ModuleLoader__: { load(record: { factory: (require: (name: string) => unknown) => { apply: typeof SettingsApply } }) {
    apply = record.factory((name: string) => name === '@deepseek-ai/cordis' ? require(name) : settingsRequire(name)).apply
  } } },
  console, setTimeout, clearTimeout, queueMicrotask, structuredClone,
})
if (!apply) throw new Error('settings bundle did not register its factory')
export const installSettings = apply
