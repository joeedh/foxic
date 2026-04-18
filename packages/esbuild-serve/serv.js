import esbuild from 'esbuild'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import Path from 'path'
import { pathToFileURL } from 'node:url'

const options = yargs(hideBin(process.argv))
  .help('help')
  .command(
    'serv',
    'Start Web Server',
    (yargs) => {},
    function (options) {
      const entryFiles =
        typeof options.input === 'string' ? [options.input] : options.input
      const outDir = options.outdir
      const port = options.port
      const servedir = options.servedir ?? options.outdir

      startEsbuildServer({
        entryFiles,
        outDir,
        port,
        servedir,
      })
    },
  )
  .option('input', {
    alias       : 'i',
    type        : 'string',
    demandOption: false,
    describe    : 'Add an entrypoint',
  })
  .option('outdir', {
    alias       : 'o',
    type        : 'string',
    demandOption: false,
    describe    : 'Output directory',
    single      : true,
  })
  .option('servedir', {
    alias       : 'o',
    type        : 'string',
    demandOption: false,
    describe    : 'Serv base directory, defaults to outdir',
    single      : true,
  })
  .option('config', {
    alias       : 'C',
    type        : 'string',
    demandOption: false,
    describe    : 'Config file (defaults to .esbuild-server.js)',
    single      : true,
  })
  .option('port', {
    alias       : 'p',
    default     : '',
    type        : 'string',
    demandOption: false,
    single      : true,
    describe    : 'Port to listen on',
  })
  .number('port')
  .parse()

/*
await esbuild.build({
  entryPoints: entryfiles,
  outdir: 'dist',
  sourcemap: 'inline',
  bundle: true,
  target: 'es2022',
  format: 'esm',
  external: ['fs', 'path', 'electron', 'marked', 'parse5', 'path', 'diff'],
  treeShaking: false,
  metafile: true,
})
*/
async function startEsbuildServer({ entryFiles, outDir, port, configPath, servedir }) {
  configPath = configPath ?? '.esbuild-server.js'

  if (typeof port === 'string' && port.length > 0) {
    port = parseInt(port)
  }

  let options = {
    entryPoints: entryFiles,
    outdir     : 'dist',
    sourcemap  : 'inline',
    bundle     : true,
    target     : 'es2022',
    format     : 'esm',
    external   : ['fs', 'path', 'electron', 'marked', 'parse5', 'path', 'diff'],
    treeShaking: false,
    metafile   : true,
  }

  if (fs.existsSync(configPath)) {
    const config = await import(pathToFileURL(Path.resolve(configPath)))
    options = { ...options, ...config.default }
    if (config.default.port && !port) {
      port = config.default.port
    }
    // esbuild does not like port in it's context options, delete it
    delete options.port

    if (!port) {
      port = 5174
    }
    if (config.default.servedir) {
      servedir = config.default.servedir
      delete options.servedir
    }
  }

  const ctx = await esbuild.context(options)

  console.log('Serving at', `http://localhost:${port}`)
  await ctx.serve({ port, servedir })
}
