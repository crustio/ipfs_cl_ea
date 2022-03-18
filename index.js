const { Requester, Validator } = require('@chainlink/external-adapter')
const FormData = require('form-data')
const fs = require('fs-extra')
const { ApiPromise, WsProvider } = require('@polkadot/api')
const { typesBundleForPolkadot } = require('@crustio/type-definitions')
const { sendTx, loadAuth } = require('./util')

const crustSeeds = process.env.CRUST_SEEDS
const supportMethods = new Map([["pin", "api/v0/object/stat"], ["add", "api/v0/add"], ["cat", "api/v0/cat"]])

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  text_for_file: false,
  text_for_file_name: false,
  file: false,
  ipfs_host: false,
  method: false,
  cid: false
}

const createRequest = (input, callback) => {
  // 1.1 The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const ipfsUploaderSecret = loadAuth(crustSeeds)

  // 1.2 Analyze method
  const method = validator.validated.data.method
  if (!method) {
    callback(400, Requester.errored(jobRunID, "Please provide method from 'pin', 'add', 'cat'"))
    return
  }
  let endpoint = supportMethods.get(method)
  if (!endpoint) {
    callback(400, Requester.errored(jobRunID, "Please provide method from 'pin', 'add', 'cat'"))
    return
  }
  if ((method === "pin" || method === "cat") && !validator.validated.data.cid) {
    callback(400, Requester.errored(jobRunID, "Please provide cid"))
    return
  }

  // 2.1 IPFS configuration
  const ipfs_host = validator.validated.data.ipfs_host || process.env.IPFS_HOST || 'https://crustwebsites.net/'
  const crust_host = validator.validated.data.crust_host || process.env.CRUST_HOST || 'wss://rpc.crust.network'

  let ipfsParams = {}
  if (validator.validated.data.cid) {
    ipfsParams = {
      arg: validator.validated.data.cid
    }
  }

  // 3.1 File configuration
  const text_for_file = validator.validated.data.text_for_file
  const text_for_file_name = validator.validated.data.text_for_file_name
  let file = validator.validated.data.file

  // 3.2 Create file from text and name
  if (text_for_file_name && text_for_file) {
    file = './file_uploads/' + text_for_file_name
    fs.writeFileSync(file, text_for_file)
    // console.log($`Writing ${text_for_file} + '\n> ' + ${file}`)
  }

  // 3.3 Put file into form
  const form = new FormData()
  let form_config = {
    headers: {
      "Authorization": `Basic ${ipfsUploaderSecret}`
    }
  }
  if (file != null) {
    form.append('file', fs.createReadStream(file))
    form_config = {
      data: form,
      headers: {
        "Content-Type": "multipart/form-data",
        "Authorization": `Basic ${ipfsUploaderSecret}`,
        ...form.getHeaders()
      }
    }
  }

  // 4.1 The whole configuration
  const ipfsConfig = {
    url: `${ipfs_host}${endpoint}`,
    params: ipfsParams,
    method: 'POST',
    ...form_config
  }
  // console.log(ipfsConfig)

  // 4.2 The Requester allows IPFS API calls be retry in case of timeout
  // or connection failure
  Requester.request(ipfsConfig, customError)
    .then(async (response) => {
      // console.log(response.data)

      if (method === 'add' || method === 'pin') {
        // 4.3 Request crust endpoint to place storage order
        const cid = response.data.Hash
        let size = 0
        if (method === 'pin') {
          size = response.data.CumulativeSize
        } else {
          size = response.data.size
        }
        const crustChain = new ApiPromise({
          provider: new WsProvider(crust_host),
          typesBundle: typesBundleForPolkadot
        })
        await crustChain.isReadyOrError

        const tx = crustChain.tx.market.placeStorageOrder(cid, size, 0, 0)
        const res = await sendTx(tx, crustSeeds)

        if (res) {
          console.log(`Publish ${cid} success`)
        } else {
          console.error('Publish failed with \'Send transaction failed\'')
        }
        response.data.result = cid
      } else {
        response.data = {
          cid: validator.validated.data.cid,
          result: response.data
        }
      }

      callback(response.status, Requester.success(jobRunID, response))
    })
    .catch(error => {
      console.log(error)
      callback(500, Requester.errored(jobRunID, error))
    })
}

module.exports.createRequest = createRequest