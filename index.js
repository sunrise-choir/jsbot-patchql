const { execFile } = require('child_process')
const os = require('os')
const path = require('path')
const envPaths = require('env-paths')
const mkdirp = require('mkdirp')

const builds = [
  'linux-x64',
  'linux-arm64',
  'android-arm64',
  'darwin-x64',
  'win32-x64',
  'win32-x32'
]

module.exports = {
  name: 'jsbot-patchql',
  version: '1.0.1',
  manifest: require('./manifest.json'),
  init: function (ssb, config) {
    const paths = envPaths('jsbot-patchql') // TODO: if this is in eg. patchbay, it'd be nice to put it in patchbay dir. Later tho.
    const databaseDir = paths.data
    const defaultEnv = {
      'DATABASE_URL': path.join(databaseDir, 'ssb-patchql.sqlite'),
      'OFFSET_LOG_PATH': path.join(config.path, 'flume', 'log.offset'),
      'SSB_SECRET_KEY': ssb.keys.private,
      'SSB_PUB_KEY': ssb.keys.id
    }
    let childProcess

    function start (opts) {
      console.log('Starting jsbot-patchql on port 8080. Try out some graphql at http://localhost:8080')
      // process is already running
      if (childProcess && !childProcess.killed) {
        return
      }

      const env = Object.assign({}, defaultEnv, opts)

      const arch = os.arch()
      const platform = os.platform()

      const system = `${platform}-${arch}`

      if (builds.includes(system)) {
        const execName = `ssb-patchql${platform === 'win32' ? '.exe' : ''}`
        const execPath = path.join(__dirname, 'bin', system, execName)

        mkdirp.sync(databaseDir)

        childProcess = execFile(execPath, [], { env }, (error, stdout, stderr) => {
          if (error) {
            console.error(error)
          }
        })
      } else {
        console.error(`No sbot-patchql builds for your arch ${platform}-${arch}`)
      }
    }

    function stop () {
      if (childProcess) {
        childProcess.kill()
      }
    }
    
    ssb.close.hook(function (fn, args) {
      stop()
      return fn.apply(this, args)
    })
    
    return {
      start,
      stop
    }
  }

}
