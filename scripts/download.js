#!/usr/bin/env node
const os = require('os')
const mkdirp = require('mkdirp')
const envPaths = require('env-paths')
const request = require('request')
const fs = require('fs')
const path = require('path')

const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const writeFile = require('pull-write-file')
const gunzip = require('gunzip-maybe')
const tar = require('tar-fs')
const unzip = require('unzip')

const paths = envPaths('jsbot-patchql')
mkdirp.sync(paths.temp)

const binName = 'ssb-patchql'

const arch = os.arch()
const platform = os.platform()
const version = getVersionString()

const triple = buildTriple({ arch, platform })
const fileExtension = getFileExtension({ platform })

const fileName = getReleaseFilename({ version, fileExtension, triple })
const url = getDownloadUrl({ fileName, version })

const packedFilePath = `${paths.temp}/${fileName}`
const unpackPath = paths.temp
const binPath = path.join('bin', `${platform}-${arch}`)

pull(
  pull.once({ packedFilePath }),
  pull.asyncMap(download),
  pull.asyncMap(unpack({ packedFilePath, unpackPath, platform })),
  pull.asyncMap(createBinDir({ binPath })),
  pull.asyncMap(moveBinary({ unpackPath, binPath, binName, platform })),
  pull.collect((err) => {
    if (err) throw err
    console.log('Download complete')
  })
)

function createBinDir ({ binPath }) {
  return function (_, cb) {
    mkdirp(binPath, cb)
  }
}

function moveBinary ({ unpackPath, binPath, binName, platform }) {
  return function (_, cb) {
    const file = platform === 'win32' ? `${binName}.exe` : binName
    const from = path.join(unpackPath, file)
    const to = path.join(binPath, file)
    fs.copyFile(from, to, cb)
  }
}

function unpack ({ packedFilePath, unpackPath, platform }) {
  return platform === 'win32' ? unpackZip : unpackTar

  function unpackTar (_, cb) {
    fs.createReadStream(packedFilePath)
      .pipe(gunzip())
      .pipe(tar.extract(unpackPath))
      .on('finish', () => {
        cb(null)
      })
      .on('error', (err) => {
        cb(err)
      })
  }

  function unpackZip (_, cb) {
    fs.createReadStream(packedFilePath)
      .pipe(unzip.Extract({ path: unpackPath }))
      .on('finish', () => {
        cb(null)
      })
      .on('error', (err) => {
        cb(err)
      })
  }
}

function download ({ packedFilePath }, cb) {
  pull(
    toPull.source(request(url)),
    writeFile(packedFilePath, cb)
  )
}

function getVersionString () {
  const { ssbPatchqlVersion } = require('../package.json')
  return ssbPatchqlVersion
}

function buildTriple ({ arch, platform }) {
  const map = {
    linux: {
      x64: 'x86_64-unknown-linux-musl',
      arm64: 'aarch64-unknown-linux-gnu'
    },
    win32: {
      x64: 'x86_64-pc-windows-msvc',
      x32: 'i686-pc-windows-msvc'
    },
    darwin: {
      x64: 'x86_64-apple-darwin'
    },
    android: {
      arm64: 'aarch64-linux-android'
    }
  }

  return map[platform][arch]
}

function getFileExtension ({ platform }) {
  const map = {
    win32: 'zip',
    linux: 'tar.gz',
    android: 'tar.gz',
    darwin: 'tar.gz'
  }

  return map[platform]
}

function getReleaseFilename ({ version, triple, fileExtension }) {
  return `${binName}-${version}-${triple}.${fileExtension}`
}

function getDownloadUrl ({ fileName, version }) {
  return `https://github.com/sunrise-choir/ssb-patchql/releases/download/${version}/${fileName}`
}
