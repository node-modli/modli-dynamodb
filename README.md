[![wercker status](https://app.wercker.com/status/76a8e0a57f5bbb26274c21e097eda3d1/s/master "wercker status")](https://app.wercker.com/project/bykey/76a8e0a57f5bbb26274c21e097eda3d1)
# Modli - DynamoDB Adapter

This module provides adapter for the [DynamoDB](https://aws.amazon.com/dynamodb)
datasource for integration with [Modli](https://github.com/node-modli).

## Installation

```
npm install modli-dynamodb --save
```

## Usage

```javascript
import { model, adapter, Joi, use } from 'modli';
import { dynamodb } from 'modli-dynamodb';

// Create a model
model.add({
  name: 'testModel',
  version: 1,
  schema: {
    /* ...schema properties... */
  }
});

// Add adapter using NeDB
model.add({
  name: 'testDynamo',
  source: dynamodb
  config: {
    /*...*/
  }
});

const testModli = use('testModel', 'testDynamo');
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