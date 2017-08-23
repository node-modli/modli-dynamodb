[![Circle CI](https://circleci.com/gh/node-modli/modli-dynamodb.svg?style=svg)](https://circleci.com/gh/node-modli/modli-dynamodb)
[![Code Climate](https://codeclimate.com/github/node-modli/modli-dynamodb/badges/gpa.svg)](https://codeclimate.com/github/node-modli/modli-dynamodb)
[![Test Coverage](https://codeclimate.com/github/node-modli/modli-dynamodb/badges/coverage.svg)](https://codeclimate.com/github/node-modli/modli-dynamodb/coverage)

# Modli - DynamoDB Adapter

This module provides adapter for the [DynamoDB](https://aws.amazon.com/dynamodb)
datasource for integration with [Modli](https://github.com/node-modli).

## Installation

```
npm install modli-dynamodb --save
```

## Working Locally

**IMPORTANT:** For testing (with linked services) to run correctly you must have [docker](http://www.docker.com) and Binci `npm install binci -g` installed.

## Usage

Configure your adapter and model
```javascript
import { model, adapter, use } from 'modli';
import dynamodb from 'modli-dynamodb';

// Set your configuration
let dynamoConfig = {
  region: 'us-east-1',                // Your specific AWS Region
  endpoint: 'http://localhost:8000',  // Optional value to specify an end point
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '123456789',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '123456789'
};
```

Add an instance of the model where the `autoCreate` flag is used to determine if `helpers.checkCreateTable()` should automatically create the table from the model.

Use `indexes` to define a hash key, range key or global secondary indexes as desired.

The optional index key `projectionType` can specify a projection type of 'ALL', 'KEYS_ONLY' or 'INCLUDE'.  Please note that the use of 'INCLUDE' also requires the index key `nonKeyAttributes` as an array of keys to include in the projection.

Both `projectionType` and `nonKeyAttributes` are optional values and the projection type will default to 'ALL' in their absence.


```javascript
model.add({
  name: 'roles',
  version: 1,
  autoCreate: true,
  indexes: [
    { keytype: 'hash', value: 'id', type: 'N'},
    { keytype: 'secondary', value: 'login', type: 'S', projectionType: 'INCLUDE', nonKeyAttributes: ['age']}
  ],
  schema: {
    id: { type: 'string' },
    name: { type: 'string' },
    age: { type: 'number' }
  }
});
```

Or you can add a _composite key_ global secondary index like so:

```javascript
model.add({
  name: 'logs',
  version: 1,
  autoCreate: true,
  indexes: [
    { keytype: 'hash', value: 'id', type: 'N'},
    { keytype: 'range', value: 'createdAt', type: 'S'},
    { keytype: 'secondary', values: [{keytype: 'hash', value: 'login', type: 'S'}, {keytype: 'range', value: 'createdAt', type: 'S'}]}
  ],
  schema: {
    id: { type: 'number' },
    login: { type: 'string' },
    createdAt: { type: 'string' }
  }
});
```

Add the adapter with the previously defined config object structure:

```javascript
adapter.add({
  name: 'dynamoAdapter',
  source: dynamodb,
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

Perform a full unfiltered scan of a table with an optional dynamo scan-level filter that doesn't rely on secondary indexes.  Optional filters are constructed in a way that correlates to dynamo filter conditionals.  In addition, optionally pass a `limit` and `lastKey`, which could be used to support pagination.

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

testDynamo.scan(undefined, {limit: 10})
  .then(/*...*/)
  .catch(/*...*/);

testDynamo.scan({age: { between: [18, 26]}}, {limit: 25, lastKey: 'somekey'})
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

### `readPaginate`

Performs a read on a table expecting a global secondary index that accepts a `limit` and `lastKey`, which could be used to support pagination.

```javascript
testDynamo.readPaginate({SOMEINDEX: SomeValue}, {limit: 10})
  .then(/*...*/)
  .catch(/*...*/);
```

```javascript
testDynamo.readPaginate({SOMEINDEX: SomeValue}, {limit: 25, lastKey: 'SomeKey'})
  .then(/*...*/)
  .catch(/*...*/);
```

### `getItemByHash`

Performs a read on a table expecting a HASH / Value pair

```javascript
testDynamo.getItemByHash({SOMEHASH: SomeValue})
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
testDynamo.update({HASH: 'SomeValue'}, { /* update object */ })
  .then(/*...*/)
  .catch(/*...*/);
```

### `patch`

Partial updates a row in the table by HASH / Value pair and JSON Object specifying new values

```javascript
testDynamo.patch({HASH: 'SomeValue'}, { /* partial update object */ })
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

## Binci and Scripts

The system utilizes Binci for running tasks in containers. The below tasks will
be executed in containers via `binci {task-name}`:

* `clean` will remove the `/node_modules`, `/build` and `/coverage` directories
* `install` will install dependencies
* `lint` will lint all files in `/src` and `/test`
* `build` will transpile ES2015 code in `/src` to `/build`
* `mocha` will run all spec files in `/test/src` recursively
* `test` will run both `lint` and `cover`
* `cover` will run code coverage on all tests in `/test/src` recursively

## Testing

Running `binci mocha` will run the tests.

## License

Modli-DynamoDB is licensed under the MIT license. Please see `LICENSE.txt` for full details.

## Credits

Modli-DynamoDB was designed and created at [TechnologyAdvice](http://www.technologyadvice.com).
