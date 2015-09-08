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

Add an instance of the model

```javascript
model.add({
  name: 'roles',
  version: 1, 
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
newModel = use('roles', 'dynamoAdapter');
```

## Methods

### `setSchema`

Sets the schema for the adapter to use as its in memory model. 

```javascript
dynamoAdapter.scan()
  .then(/*...*/)
  .catch(/*...*/);
```

### `list`

Gets a list of all active tables

```javascript
dynamoAdapter.list()
  .then(/*...*/)
  .catch(/*...*/);
```

### `scan`

Perform a full unfiltered scan of a table

```javascript
dynamoAdapter.scan()
  .then(/*...*/)
  .catch(/*...*/);
```

### `createTable`

Pass through method that uses explicit dynamo creation params to create a table

```javascript
dynamoAdapter.createTable(dynamoParams)
  .then(/*...*/)
  .catch(/*...*/);
```

### `createTableFromModel`

Performs a deterministic create based on the specified schema.  Will construct the creation query without additional input.

```javascript
dynamoAdapter.createTableFromModel()
  .then(/*...*/)
  .catch(/*...*/);
```

### `deleteTable`

Deletes a table by specified object containing hash / value pair

```javascript
dynamoAdapter.deleteTable({TableName: 'myTable'})
  .then(/*...*/)
  .catch(/*...*/);
```

### `create`

Creates a new entry in the table specified in the schema

```javascript
dynamoAdapter.create({HASH:Value, SomeIndex: OtherValue})
  .then(/*...*/)
  .catch(/*...*/);
```

### `read`

Performs a deterministic read on a table by hash / value pair OR secondary index / value pair

```javascript
dynamoAdapter.read({HASH: SomeValue})
  .then(/*...*/)
  .catch(/*...*/);
```

```javascript
dynamoAdapter.read({SOMEINDEX: SomeOtherValue})
  .then(/*...*/)
  .catch(/*...*/);
```

### `getItemByHash`

Performs a read on a table expecting a HASH / Value pair

```javascript
dynamoAdapter.getItemById({SOMEHASH: SomeValue})
  .then(/*...*/)
  .catch(/*...*/);
```

### `getItemById`

Performs a read on a table expecting a global secondary index

```javascript
dynamoAdapter.getItemById({SOMEINDEX: SomeValue})
  .then(/*...*/)
  .catch(/*...*/);
```

### `getItemsInArray`

Calls batchGetItem using a Hash identifier

```javascript
dynamoAdapter.getItemsInArray('HASHNAME', [1,2,3,4])
  .then(/*...*/)
  .catch(/*...*/);
```

### `update`

Updates a row in the table by HASH / Value pair and JSON Object specifying new values

```javascript
dynamoAdapter.update({HASH: 'SomeValue'}, {Name: 'New Name'})
  .then(/*...*/)
  .catch(/*...*/);
```

### `delete`

Deletes a row from the table by HASH / Value pair

```javascript
dynamoAdapter.delete({HASH: 'SomeValue'})
  .then(/*...*/)
  .catch(/*...*/);
```

### `extend`

Extends the adapter to allow custom methods

```javascript
dynamoAdapter.extend('methodName', () => {
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
