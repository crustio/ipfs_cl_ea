const createRequest = require('./index').createRequest

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.EA_PORT || 8080
const crustSeeds = process.env.CRUST_SEEDS
const timeout = process.env.TIMEOUT

if (!crustSeeds || timeout) {
  console.error("Please set environment variable 'CRUST_SEEDS' or 'TIMEOUT'!")
} else {
  app.use(bodyParser.json())

  app.post('/', (req, res) => {
    console.log('POST Data: ', req.body)
    createRequest(req.body, (status, result) => {
      console.log('Result: ', result)
      res.status(status).json(result)
    })
  })

  app.listen(port, () => console.log(`Listening on port ${port}!`))
}
