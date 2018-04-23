const {PassThrough} = require('stream')

function bufferToStream(buf) {
  const stream = new PassThrough()
  stream.end(buf)
  return stream
}

module.exports = {bufferToStream}
