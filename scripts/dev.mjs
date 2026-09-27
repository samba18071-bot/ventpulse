import { spawn } from 'node:child_process'

const processes = [
  spawn(process.execPath, ['src/server.js'], { stdio: 'inherit', env: process.env }),
  spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--host', '127.0.0.1'], { stdio: 'inherit', env: process.env }),
]

function stop() {
  for (const child of processes) child.kill('SIGTERM')
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.on('exit', stop)

for (const child of processes) {
  child.on('exit', code => {
    if (code && code !== 143) process.exitCode = code
  })
}
