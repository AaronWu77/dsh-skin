/** Compile the real production roots with the companion Host's exact augmentation.
 * The virtual fixture never enters the plugin's normal type environment, so tests
 * cannot accidentally supply a missing production declaration.
 */
import { resolve } from 'node:path'
import ts from 'typescript'

const root = resolve()
const fixturePath = resolve(root, 'tests/.virtual-companion-host.ts')
const fixture = `
import type {} from '../src/client/companion-host.ts'
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'conversation.chat.flow.running.icon': {
      kind: 'single'
      scope: 'session'
      owner: { readonly className: string | undefined }
    }
  }
}
`

/** Return production and duplicate-Host merge diagnostics, without emitting files. */
export function companionHostTypeDiagnostics(): string {
  const configPath = resolve(root, 'tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
  const parsed = ts.parseJsonConfigFileContent({ ...config.config, include: ['src'] }, ts.sys, root)
  const host = ts.createCompilerHost(parsed.options)
  const getSourceFile = host.getSourceFile
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    resolve(fileName) === fixturePath
      ? ts.createSourceFile(fileName, fixture, languageVersion)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  // Check production alone first; the companion fixture must not rescue missing typing.
  const production = ts.createProgram(parsed.fileNames, parsed.options, host)
  const combined = ts.createProgram([...parsed.fileNames, fixturePath], parsed.options, host)
  return [...parsed.errors, ...ts.getPreEmitDiagnostics(production), ...ts.getPreEmitDiagnostics(combined)]
    .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')).join('\n')
}
