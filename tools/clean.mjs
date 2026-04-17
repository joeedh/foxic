import fs from 'fs'
import Path from 'path'

function glob(s, end = false) {
  s = s.replace(/\\/g, '\\\\')
  s = s.replace(/\./g, '\\.')
  s = s.replace(/\*\*/g, '$G$').replace(/\*/g, '[^/\\\\]*').replace(/\$G\$/g, '.*')
  if (end) {
    s += '$'
  }
  return new RegExp(s)
}
function globend(s) {
  return glob(s, true)
}
const ignore = [
  //
  '**(.git|.claude|.windsurf|.vs)**',
].map((s) => glob(s))

const deletePatterns = [
  //
  '**/node_modules',
  '**/dist',
  '**/.turbo/cache',
].map((s) => glob(s))

const match = (s, patterns) => patterns.find((p) => p.test(s))

const walk = (dir) => {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const testpath = '/' + Path.join(dir, file).replace(/\\/g, '/')
    const path = Path.join(dir, file)

    if (fs.statSync(path).isDirectory()) {
      if (match(testpath, ignore)) {
        continue
      }
      if (match(testpath, deletePatterns)) {
        console.log('delete:', testpath)
        fs.rmSync(path, { recursive: true, force: true })
        continue
      }

      walk(path)
    }
  }
}
walk('.')
