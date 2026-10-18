import { readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import { bundle } from 'lightningcss'

const root = dirname(fileURLToPath(import.meta.url))
const externals = ['react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-primitives']

export default defineConfig([
  { entry: { index: 'src/host/index.ts' }, outDir: 'lib', platform: 'node', format: 'esm', dts: true, fixedExtension: false, clean: false },
  {
    entry: { client: 'src/client/index.ts' }, outDir: 'lib', platform: 'browser', format: 'cjs', dts: false, sourcemap: true, clean: false,
    deps: { neverBundle: source => externals.some(name => source === name || source.startsWith(name + '/')), alwaysBundle: source => !externals.some(name => source === name || source.startsWith(name + '/')) },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    plugins: [{
      name: 'owned-skin-css',
      resolveId(source, importer) {
        if (!source.endsWith('.css?inline')) return null
        return resolve(importer ? dirname(importer) : root, source)
      },
      load(id) {
        if (!id.endsWith('.css?inline')) return null
        const filename = id.slice(0, -7)
        for (const entry of readdirSync(dirname(filename))) if (entry.endsWith('.css')) this.addWatchFile(resolve(dirname(filename), entry))
        const result = bundle({ filename, minify: true })
        return 'export default ' + JSON.stringify(Buffer.from(result.code).toString('utf8'))
      },
    }, {
      name: 'client-import-check',
      resolveId(source) {
        if (source.startsWith('@deepseek-ai/') && !externals.includes(source)) throw new Error('dsh-skin: forbidden browser value import ' + source)
        return null
      },
    }],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-skin", factory: (require) => {',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
