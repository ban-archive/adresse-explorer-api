const {PassThrough} = require('stream')
const {dirname} = require('path')
const {promisify} = require('util')

const mkdirp = require('mkdirp')

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

module.exports = {bufferToStream, arrayToStream, ensureParentDirectoryExists}
