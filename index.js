const { Requester, Validator } = require('@chainlink/external-adapter')
const FormData = require('form-data')
const fs = require('fs-extra')
const { ApiPromise, WsProvider } = require('@polkadot/api')
const { typesBundleForPolkadot } = require('@crustio/type-definitions')
const { sendTx, loadAuth } = require('./util')

const crustSeeds = process.env.CRUST_SEEDS

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

// curl -X POST -F file=@test.json "http://127.0.0.1:5001/api/v0/add?quiet=<value>&quieter=<value>&silent=<value>&progress=<value>&trickle=<value>&only-hash=<value>&wrap-with-directory=<value>&chunker=size-262144&pin=true&raw-leaves=<value>&nocopy=<value>&fscache=<value>&cid-version=<value>&hash=sha2-256&inline=<value>&inline-limit=32"

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  text_for_file: false,
  text_for_file_name: false,
  quiet: false,
  quieter: false,
  silent: false,
  progress: false,
  trickle: false,
  pin: false,
  file: false,
  ipfs_host: false,
  endpoint: false,
  arg: false
}

const createRequest = (input, callback) => {
  // 1.1 The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id

  // 2.1 IPFS configuration
  const quiet = validator.validated.data.quiet || 'false'
  const quieter = validator.validated.data.quieter || 'false'
  const silent = validator.validated.data.silent || 'false'
  const progress = validator.validated.data.progress || 'false'
  const trickle = validator.validated.data.trickle || 'false'
  const pin = validator.validated.data.pin || 'true'
  const arg = validator.validated.data.arg
  const ipfs_host = validator.validated.data.ipfs_host || 'https://crustwebsites.net/'
  const crust_host = validator.validated.data.crust_host || 'wss://rpc.crust.network'
  const endpoint = validator.validated.data.endpoint || 'api/v0/add'

  // 2.2 IPFS params
  const ipfsUrl = `${ipfs_host}${endpoint}`
  const ipfsParams = {
    pin,
    trickle,
    progress,
    silent,
    quieter,
    quiet,
    arg
  }

  // 3.1 File configuration
  const text_for_file = validator.validated.data.text_for_file
  const text_for_file_name = validator.validated.data.text_for_file_name
  let file = validator.validated.data.file

  // 3.2 Create file from text and name
  if (text_for_file_name && text_for_file) {
    file = './file_uploads/' + text_for_file_name
    fs.writeFileSync(file, text_for_file)
    //console.log($`Writing ${text_for_file} + '\n> ' + ${file}`)
  }

  // 3.3 Put file into form
  const form = new FormData()
  let form_config = {}
  if (file != null) {
    const ipfsUploaderSecret = loadAuth(crustSeeds)
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
    url: ipfsUrl,
    params: ipfsParams,
    method: 'POST',
    ...form_config
  }
  console.log(ipfsConfig)

  // 4.2 The Requester allows IPFS API calls be retry in case of timeout
  // or connection failure
  Requester.request(ipfsConfig, customError)
    .then(async (response) => {
      console.log(response.data)
      
      if (endpoint === 'api/v0/add') {
        // 4.3 Request crust endpoint to place storage order
        const cid = response.data.Hash
        const size = response.data.Size
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
         // 4.4 Other request
        response.data.result = response.data.Hash
      }

      callback(response.status, Requester.success(jobRunID, response))
    })
    .catch(error => {
      console.log(error)
      callback(500, Requester.errored(jobRunID, error))
    })
}

module.exports.createRequest = createRequest

// curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"file":"test.json"}}'
// curl -X POST "http://127.0.0.1:5001/api/v0/block/get?arg=QmTgqnhFBMkfT9s8PHKcdXBn1f5bG3Q5hmBaR4U6hoTvb1"
// curl -X POST "http://127.0.0.1:5001/api/v0/cat?arg=Qmc2gHt642hnf27iptGbbrEG94vwGnVH48KyeMtjCF5icH"
// curl -X POST "http://127.0.0.1:5001/api/v0/add" -F file=@test.json
// curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"endpoint":"api/v0/cat", "arg":"Qmc2gHt642hnf27iptGbbrEG94vwGnVH48KyeMtjCF5icH"}}'
