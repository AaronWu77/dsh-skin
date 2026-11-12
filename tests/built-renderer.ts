/** Evaluate the published renderer factory instead of importing its browser wrapper as ESM. */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import type { SlotRegistry as RegistryType, apply as RendererApply } from '@deepseek-ai/dsh-client-ui-renderer/client'

const require = createRequire(import.meta.url)
type RendererModule = { SlotRegistry: typeof RegistryType; apply: typeof RendererApply }
let exports: RendererModule | undefined
runInNewContext(readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-renderer/client'), 'utf8'), {
  window: { __ModuleLoader__: { load(record: { id: string; factory: (require: NodeRequire) => RendererModule }) {
    exports = record.factory(require)
  } } },
  document, console, setTimeout, clearTimeout, queueMicrotask,
})
if (!exports) throw new Error('renderer bundle did not register its factory')
export const SlotRegistry = exports.SlotRegistry
export const installRenderer = exports.apply
