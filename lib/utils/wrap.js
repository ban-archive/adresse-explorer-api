function w(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      console.error(error)
      res.status(500).send({
        code: 500,
        message: error.message
      })
    }
  }
}

module.exports = w
