[![wercker status](https://app.wercker.com/status/76a8e0a57f5bbb26274c21e097eda3d1/s/master "wercker status")](https://app.wercker.com/project/bykey/76a8e0a57f5bbb26274c21e097eda3d1)
[![Code Climate](https://codeclimate.com/github/node-modli/modli-dynamodb/badges/gpa.svg)](https://codeclimate.com/github/node-modli/modli-dynamodb)
[![Test Coverage](https://codeclimate.com/github/node-modli/modli-dynamodb/badges/coverage.svg)](https://codeclimate.com/github/node-modli/modli-dynamodb/coverage)

# Modli - DynamoDB Adapter

This module provides adapter for the [DynamoDB](https://aws.amazon.com/dynamodb)
datasource for integration with [Modli](https://github.com/node-modli).

## Installation

```
npm install modli-dynamodb --save
```

## Usage

Configure your adapter and model
```javascript
import { model, adapter, Joi, use } from 'modli';
import dynamodb from 'modli-dynamodb';

// Set your configuration
let dynamoConfig = {
  region: 'us-east-1',                // Your specific AWS Region
  endpoint: 'http://localhost:8000',  // Optional value to specify an end point
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '123456789',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '123456789'
};
```

Add an instance of the model where the `autoCreate` flag is used to determine if calls to non-existant tables should automatically create the table from the model

```javascript
model.add({
  name: 'roles',
  version: 1, 
  autoCreate: true,
  schema: {
    id: Joi.string(),
    name: Joi.string(),
    age: Joi.number()
  }
});
```

Add the adapter with the previously defined config object structure:

```javascript
adapter.add({
  name: 'dynamoAdapter',
  source: DynamoAdapter,
  config: dynamoConfig
});
```

You can now use the adapter with the model with:

```javascript
const testDynamo = use('roles', 'dynamoAdapter');
```

## Methods

### `list`

Gets a list of all active tables

```javascript
testDynamo.list()
  .then(/*...*/)
  .catch(/*...*/);
```

### `scan`

Perform a full unfiltered scan of a table with an optional dynamo scan-level filter that doesn't rely on secondary indexes.  Optional filters are constructed in a way that correlates to dynamo filter conditionals

```javascript
testDynamo.scan()
  .then(/*...*/)
  .catch(/*...*/);

testDynamo.scan({email: {eq: 'me@email.com'}})
  .then(/*...*/)
  .catch(/*...*/);

testDynamo.scan({accounts: {contains: 'someuser'}})
  .then(/*...*/)
  .catch(/*...*/);

testDynamo.scan({firstName: { in: ['Ben', 'Tom']}})
  .then(/*...*/)
  .catch(/*...*/);

testDynamo.scan({age: { between: [18, 26]}})
  .then(/*...*/)
  .catch(/*...*/);

testDynamo.scan({accounts: {contains: 'someuser'}, email: {eq: 'me@email.com'}})
  .then(/*...*/)
  .catch(/*...*/);


```

### `createTable`

Pass through method that uses explicit dynamo creation params to create a table

```javascript
testDynamo.createTable(dynamoParams)
  .then(/*...*/)
  .catch(/*...*/);
```

### `createTableFromModel`

Performs a deterministic create based on the specified schema.  Will construct the creation query without additional input.

```javascript
testDynamo.createTableFromModel()
  .then(/*...*/)
  .catch(/*...*/);
```

### `deleteTable`

Deletes a table by specified object containing hash / value pair

```javascript
testDynamo.deleteTable({TableName: 'myTable'})
  .then(/*...*/)
  .catch(/*...*/);
```

### `create`

Creates a new entry in the table specified in the schema

```javascript
testDynamo.create({HASH:Value, SomeIndex: OtherValue})
  .then(/*...*/)
  .catch(/*...*/);
```

### `read`

Performs a deterministic read on a table by hash / value pair OR secondary index / value pair

```javascript
testDynamo.read({HASH: SomeValue})
  .then(/*...*/)
  .catch(/*...*/);
```

```javascript
testDynamo.read({SOMEINDEX: SomeOtherValue})
  .then(/*...*/)
  .catch(/*...*/);
```

### `getItemByHash`

Performs a read on a table expecting a HASH / Value pair

```javascript
testDynamo.getItemById({SOMEHASH: SomeValue})
  .then(/*...*/)
  .catch(/*...*/);
```

### `getItemById`

Performs a read on a table expecting a global secondary index

```javascript
testDynamo.getItemById({SOMEINDEX: SomeValue})
  .then(/*...*/)
  .catch(/*...*/);
```

### `getItemsInArray`

Calls batchGetItem using a Hash identifier

```javascript
testDynamo.getItemsInArray('HASHNAME', [1,2,3,4])
  .then(/*...*/)
  .catch(/*...*/);
```

### `update`

Updates a row in the table by HASH / Value pair and JSON Object specifying new values

```javascript
testDynamo.update({HASH: 'SomeValue'}, {Name: 'New Name'})
  .then(/*...*/)
  .catch(/*...*/);
```

### `delete`

Deletes a row from the table by HASH / Value pair

```javascript
testDynamo.delete({HASH: 'SomeValue'})
  .then(/*...*/)
  .catch(/*...*/);
```

### `extend`

Extends the adapter to allow custom methods

```javascript
testDynamo.extend('methodName', () => {
  /*...*/
})
```

## Makefile and Scripts

A `Makefile` is included for managing build and install tasks. The commands are
then referenced in the `package.json` `scripts` if that is the preferred
task method:

* `all` (default) will run all build tasks
* `start` will run the main script
* `clean` will remove the `/node_modules` directories
* `build` will transpile ES2015 code in `/src` to `/build`
* `test` will run all spec files in `/test/src`
* `test-cover` will run code coverage on all tests
* `lint` will lint all files in `/src`

## Testing

Running `make test` will run the full test suite. Since adapters require a data
source if one is not configured the tests will fail. To counter this tests are
able to be broken up.

**Test Inidividual File**

An individual spec can be run by specifying the `FILE`. This is convenient when
working on an individual adapter.

```
make test FILE=some.spec.js
```

The `FILE` is relative to the `test/src/` directory.

**Deploys**

For deploying releases, the `deploy TAG={VERSION}` can be used where `VERSION` can be:

```
<newversion> | major | minor | patch | premajor
```

Both `make {COMMAND}` and `npm run {COMMAND}` work for any of the above commands.

## License

Modli-DynamoDB is licensed under the MIT license. Please see `LICENSE.txt` for full details.

## Credits

Modli-DynamoDB was designed and created at [TechnologyAdvice](http://www.technologyadvice.com).
