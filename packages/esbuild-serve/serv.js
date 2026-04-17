import esbuild from 'esbuild'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import Path from 'path'
import { pathToFileURL } from 'node:url';

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

      startEsbuildServer({
        entryFiles,
        outDir,
        port,
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
  .option('config', {
    alias       : 'C',
    type        : 'string',
    demandOption: false,
    describe    : 'Config file (defaults to .esbuild-server.js)',
    single      : true,
  })
  .option('port', {
    alias       : 'p',
    default     : 5723,
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
async function startEsbuildServer({ entryFiles, outDir, port, configPath }) {
  configPath = configPath ?? '.esbuild-server.js'

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
  }

  const ctx = await esbuild.context(options)

  await ctx.serve({ port, servedir: Path.resolve('../public') })
  console.log('Serving at', `http://localhost:${port}`)
  //await ctx.serve({ port })
}
