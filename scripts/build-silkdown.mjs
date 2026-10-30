import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = resolve(root, 'node_modules/silkdown-monorepo/packages/core')
const distEntry = resolve(coreDir, 'dist/index.js')

if (existsSync(distEntry)) {
  process.exit(0)
}

if (!existsSync(coreDir)) {
  console.warn('[build-silkdown] silkdown-monorepo not installed; skipping')
  process.exit(0)
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

// Install build tooling only. Peer @codemirror packages must resolve from the
// app root — nested copies break Silkdown live preview under Vite.
run('npm', ['install', '--omit=peer'], coreDir)
run('npm', ['run', 'build'], coreDir)
