const entryfiles = process.argv.slice(2)
import esbuild from 'esbuild'

await esbuild.build({
  entryPoints: entryfiles,
  outdir     : 'dist',
  sourcemap  : 'inline',
  bundle     : true,
  target     : 'es2022',
  format     : 'esm',
  external   : ['fs', 'path', 'electron', 'marked', 'parse5', 'path', 'diff'],
  treeShaking: false,
  metafile   : true,
})
