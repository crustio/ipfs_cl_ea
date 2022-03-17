# Chainlink NodeJS IPFS(Crust) External Adapter

Save and load file on Crust. 

## Examples

### Store file on Crust by using file name and file text

Input:

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"text_for_file_name":"test2", "text_for_file":"This is test"}}'
```

Output:

```json
{
  "jobRunID":0,
  "data":
  {
    "Name":"test2",
    "Hash":"QmVg3Z7A4pWLg9Ynqg4b7jDUQwZPzGCHaWafe3fUY4r7x2",
    "Size":"20",
    "result":"QmVg3Z7A4pWLg9Ynqg4b7jDUQwZPzGCHaWafe3fUY4r7x2"
  },
  "result":"QmVg3Z7A4pWLg9Ynqg4b7jDUQwZPzGCHaWafe3fUY4r7x2",
  "statusCode":200
}

```

### Store file on Crust by using pinning (The file must already exist on the ipfs network)

Input:

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"endpoint":"api/v0/pin", "arg":"QmVg3Z7A4pWLg9Ynqg4b7jDUQwZPzGCHaWafe3fUY4r7x2"}}'
```

Output:

```json
{
  "jobRunID":0,
  "data":
  {
    "Name":"test2",
    "Hash":"QmVg3Z7A4pWLg9Ynqg4b7jDUQwZPzGCHaWafe3fUY4r7x2",
    "Size":"20",
    "result":"QmVg3Z7A4pWLg9Ynqg4b7jDUQwZPzGCHaWafe3fUY4r7x2"
  },
  "result":"QmVg3Z7A4pWLg9Ynqg4b7jDUQwZPzGCHaWafe3fUY4r7x2",
  "statusCode":200
}

```


### Store file on Crust locally (must be on the same device)

Input:

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"file":"./file_uploads/test.json"}}'
```

Output:

```json
{
  "jobRunID":0,
  "data":
  {
    "Name":"test.json",
    "Hash":"QmWk8NQVeoXyMizcxT3D2y85eFDQGQfmRvupCnni3nuS1q",
    "Size":"15",
    "result":"QmWk8NQVeoXyMizcxT3D2y85eFDQGQfmRvupCnni3nuS1q"
  },
  "result":"QmWk8NQVeoXyMizcxT3D2y85eFDQGQfmRvupCnni3nuS1q",
  "statusCode":200
}

```


### Cat file by using gateway

Input:

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"endpoint":"api/v0/cat", "arg":"QmVg3Z7A4pWLg9Ynqg4b7jDUQwZPzGCHaWafe3fUY4r7x2"}}'
```

Output:

```json
{"jobRunID":0,"data":{"cat":"This is test"},"statusCode":200}
```

## Install Locally

Install dependencies:

```bash
yarn
```

### Set environment variable

EA_PORT: API port, defaults to port 8080
CRUST_SEEDS: Crust account seeds

### Run

```bash
yarn start
```