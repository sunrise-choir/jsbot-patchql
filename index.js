const { execFile } = require('child_process')
const os = require('os')
const path = require('path')

module.exports = {
  name: 'jsbot-patchql',
  version: '1.0.0',
  manifest: require('./manifest.json'),
  init: function (ssb, config) {
    const env = {
      'DATABASE_URL': path.join(__dirname, 'ssb-patchql.sqlite'),
      'OFFSET_LOG_PATH': path.join(config.path, 'flume', 'log.offset'),
      'SSB_SECRET_KEY': ssb.keys.private,
      'SSB_PUB_KEY': ssb.keys.id
    }

    const arch = os.arch()
    const platform = os.platform()

    if (
      (platform === 'linux' && arch === 'x64') ||
      (platform === 'linux' && arch === 'arm64') ||
      (platform === 'android' && arch === 'arm64') ||
      (platform === 'darwin' && arch === 'x64') ||
      (platform === 'win32' && arch === 'x32') ||
      (platform === 'win32' && arch === 'x64')) {
      const execName = `ssb-patchql${platform === 'win32' ? '.exe' : ''}`
      const execPath = path.join(__dirname, 'bin', `${platform}-${arch}`, execName)

      execFile(execPath, [], { cwd: __dirname, env }, (error, stdout, stderr) => {
        if (error) {
          throw error
        }
      })
    } else {
      console.log(`No sbot-patchql builds for your arch ${platform}-${arch}`)
    }
  }
}
