const {createWriteStream} = require('fs')
const {createGzip} = require('zlib')
const {promisify} = require('util')
const {PassThrough} = require('stream')
const {dirname} = require('path')

const ms = require('mississippi')
const mkdirp = require('mkdirp')
const {stringify} = require('ndjson')

const pipe = promisify(ms.pipe)
const mkdirpAsync = promisify(mkdirp)

function bufferToStream(buf) {
  const stream = new PassThrough()
  stream.end(buf)
  return stream
}

function arrayToStream(array) {
  const stream = new PassThrough({objectMode: true})
  array.forEach(item => stream.write(item))
  stream.end()
  return stream
}

async function ensureParentDirectoryExists(path) {
  await mkdirpAsync(dirname(path))
}

async function writeGzippedNDJSONFile(items, path) {
  await ensureParentDirectoryExists(path)
  await pipe(
    arrayToStream(items),
    stringify(),
    createGzip(),
    createWriteStream(path)
  )
}

module.exports = {bufferToStream, arrayToStream, writeGzippedNDJSONFile}
