/* eslint no-unused-expressions: 0 */
/* global expect, request, describe, it, before, after */
import '../setup';
import DynamoAdapter from '../../src/index.js';
import { dbData } from './test-data';
import { model, adapter, use } from 'modli';
let dynamoConfig = {
  region: 'us-east-1',
  endpoint: process.env.MODLI_DYNAMODB_HOST,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '123456789',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '123456789'
};
// Create instances of our adapters
const standard = new DynamoAdapter(dynamoConfig);
const numeric = new DynamoAdapter(dynamoConfig);
const failAdapter = new DynamoAdapter(dynamoConfig);
const nogsiAdapter = new DynamoAdapter(dynamoConfig);
const projectionAdapter = new DynamoAdapter(dynamoConfig);
const includeAdapter = new DynamoAdapter(dynamoConfig);

// Set the schemas
numeric.setSchema(dbData.testNumericModel, '1');
standard.setSchema(dbData.testModel, '1');
failAdapter.setSchema(dbData.badModel, '1');
nogsiAdapter.setSchema(dbData.nogsiModel, '1');
projectionAdapter.setSchema(dbData.testProjectionModel, '1');
includeAdapter.setSchema(dbData.testIncludeModel, '1');

const validate = (body) => {
  // Test validation failure by passing `failValidate: true`
  if (body.Item) {
    if (body.Item.failValidate) {
      return { error: true };
    }
  } else {
    if (body.failValidate) {
      return {error: true};
    }
  }
  // Mock passing validation, return null
  return null;
};
// Mock sanitize method, this is automatically done by the model
const sanitize = (body) => {
  return body;
};
numeric.validate = validate;
standard.validate = validate;
failAdapter.validate = validate;
nogsiAdapter.validate = validate;
numeric.sanitize = sanitize;
standard.sanitize = sanitize;
failAdapter.sanitize = sanitize;
nogsiAdapter.sanitize = sanitize;
projectionAdapter.sanitize = sanitize;
includeAdapter.sanitize = sanitize;

describe('Non standard projection types', () => {
  it('Creates the KEYS_ONLY only table', (done) => {
    projectionAdapter.createTableFromModel().then((data) => {
      expect(data).to.be.an.object;
      done();
    });
  });

  it('Creates the INCLUDE only table', (done) => {
    includeAdapter.createTableFromModel().then((data) => {
      expect(data).to.be.an.object;
      done();
    });
  });

  it('removes the projection table', (done) => {
    projectionAdapter.deleteTable({TableName: dbData.testProjectionModel.tableName}).then((data) => {
      expect(data).to.be.an.object;
      done();
    });
  });

  it('removes the test table', (done) => {
    includeAdapter.deleteTable({TableName: dbData.testIncludeModel.tableName}).then((data) => {
      expect(data).to.be.an.object;
      done();
    });
  });
});

describe('Verifies integration with modli', () => {
  let newModel;
  it('Adds a model to modli object', (done) => {
    model.add({
      name: 'roles',
      version: 1,
      schema: dbData.userSchema
    });
    expect(dbData.testModel.schemas).to.be.an.object;
    expect(dbData.testModel.validate).to.be.a.function;
    expect(dbData.testModel.sanitize).to.be.a.function;
    done();
  });
  it('Adds instance of the adapter', (done) => {
    adapter.add({
      name: 'dynamoAdapter',
      source: DynamoAdapter,
      config: dynamoConfig
    });
    const actualConfig = adapter.store.dynamoAdapter.config;
    // Ensure creation
    expect(actualConfig).to.deep.equal(dynamoConfig);
    done();
  });
  it('returns an instance based on a model and adapter', () => {
    newModel = use('roles', 'dynamoAdapter');
    expect(newModel.schemas).to.be.an.object;
    expect(newModel.validate).to.be.a.function;
    expect(newModel.sanitize).to.be.a.function;
  });
});

describe('dynamo numeric tests', () => {
  describe('get schema', () => {
    it('Checks the schema', (done) => {
      expect(numeric.getSchema()).to.be.an.object;
      done();
    });
  });
  describe('table', () => {
    it('creates the numeric test table', (done) => {
      numeric.createTableFromModel().then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
    it('tests success from recreating test table again', (done) => {
      numeric.createTableFromModel().then((data) => {
        expect(data.existed).to.equal(true);
        done();
      });
    });
  });
  describe('create', () => {
    it('Creates first entry', (done) => {
      numeric.create(dbData.numericAccount.Item, '1').then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });
  describe('fail validation', () => {
    it('Hardcode failure params to fail', (done) => {
      dbData.numericAccount.Item.failValidate = true;
      numeric.create(dbData.numericAccount.Item).then(done).catch((err) => {
        delete dbData.numericAccount.Item.failValidate;
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('fail create', () => {
    it('Creates invalid params to fail', (done) => {
      numeric.create({junk: 'trash'}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('fail create table', () => {
    it('Creates invalid params to fail', (done) => {
      numeric.createTable({junk: 'trash'}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('create table with no secondary indexes', () => {
    it('Creates table with no global secondary', (done) => {
      nogsiAdapter.createTableFromModel().then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('deletes no gsi table', () => {
    it('Creates table with no global secondary', (done) => {
      nogsiAdapter.deleteTable({TableName: dbData.nogsiModel.TableName}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('fail model create table', () => {
    it('Creates an invalid model from the schema', (done) => {
      failAdapter.createTableFromModel().then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('fail scan', () => {
    it('Scans on an invalid adapter', (done) => {
      failAdapter.scan().then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('fail delete table', () => {
    it('Passes bad params to delete table', (done) => {
      failAdapter.deleteTable({junk: 'trash'}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('fail getItemsInArray', () => {
    it('fails by null array', (done) => {
      numeric.getItemsInArray('id').then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
    it('fails by empty array', (done) => {
      numeric.getItemsInArray('id', []).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
    it('fails by junk array', (done) => {
      numeric.getItemsInArray('junk', [1, 2, 3, 4]).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('read', () => {
    it('reads by numeric hash', (done) => {
      numeric.read({'id': dbData.numericAccount.Item.id}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
    it('reads by numeric secondary', (done) => {
      numeric.read({'age': dbData.numericAccount.Item.age}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
    it('reads invalid data', (done) => {
      numeric.read({junk: 'trash'}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
    it('reads an invalid hash', (done) => {
      numeric.getItemById({junk: 'trash'}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
    it('reads an invalid secondary', (done) => {
      numeric.getItemByHash({junk: 'trash'}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
});

describe('standard model', () => {
  describe('table', () => {
    it('creates the users table', (done) => {
      standard.createTableFromModel().then((data) => {
        expect(data).to.be.an.object;
        done();
      }).catch((err) => {
        done(err);
      });
    });
  });
  describe('list', () => {
    it('lists tables', (done) => {
      standard.list().then((data) => {
        expect(data.TableNames.length).to.be.above(0);
        done();
      });
    });
  });
  describe('create accounts', () => {
    it('Creates first entry', (done) => {
      standard.create(dbData.testAccount1.Item, '1').then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
    it('Creates second entry', (done) => {
      standard.create(dbData.testAccount2.Item, '1').then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });
  describe('scan tests', () => {
    let lastKey;
    before((done) => {
      standard.scan(undefined, {limit: 1}).then((data) => {
        lastKey = JSON.stringify(data.LastEvaluatedKey);
        done();
      });
    });
    it('performs a generic scan', (done) => {
      standard.scan().then((data) => {
        expect(data.Items.length).to.be.above(0);
        done();
      });
    });
    it('performs a generic scan with limit', (done) => {
      standard.scan(undefined, {version: 1, limit: 1}).then((data) => {
        expect(data.Items.length).to.be.above(0);
        done();
      });
    });
    it('performs a generic scan with limit and lastKey', (done) => {
      standard.scan(undefined, {limit: 1, lastKey}).then((data) => {
        expect(data.Items.length).to.be.above(0);
        done();
      });
    });
    it('scans dynamo with EQ', (done) => {
      standard.scan({email: {eq: 'ben@ben.com'}}).then((data) => {
        expect(data.Items.length).to.be.above(0);
        done();
      }).catch(done);
    });
    it('scans dynamo with contains', (done) => {
      standard.scan({roles: {contains: 'qa_user'}}).then((data) => {
        expect(data.Items.length).to.be.above(0);
        done();
      }).catch(done);
    });
    it('scans dynamo with in', (done) => {
      standard.scan({firstName: { in: ['Ben', 'Benji']}}).then((data) => {
        expect(data.Items.length).to.be.above(0);
        done();
      }).catch(done);
    });
    it('scans dynamo with between', (done) => {
      standard.scan({age: { between: [18, 26]}}).then((data) => {
        expect(data.Items.length).to.be.above(0);
        done();
      }).catch(done);
    });
    it('scans dynamo with multiple expression filter', (done) => {
      standard.scan({roles: {contains: 'qa_user'}, email: {eq: 'ben@ben.com'}}).then((data) => {
        expect(data.Items.length).to.be.above(0);
        done();
      }).catch(done);
    });
    it('fails the scan', (done) => {
      numeric.scan({age: {trashes: 18}}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
    it('fails a generic scan with limit and lastKey', (done) => {
      standard.scan(undefined, {limit: 1, lastKey: JSON.parse(lastKey)}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('read', () => {
    it('reads by hash', (done) => {
      standard.read({'id': dbData.testAccount1.Item.id}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
    it('reads by secondary', (done) => {
      standard.read({'authId': dbData.testAccount1.Item.authId}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });
  describe('get in array', () => {
    it('fetches items by array', (done) => {
      standard.getItemsInArray('id', [dbData.testAccount1.Item.id, dbData.testAccount2.Item.id]).then((data) => {
        expect(data).to.be.an.array;
        done();
      });
    });
  });
  describe('update', () => {
    it('updates first account', (done) => {
      standard.update({id: dbData.testAccount1.Item.id}, {email: 'test@test.com'}).then((data) => {
        expect(data.email).to.be.equal('test@test.com');
        done();
      });
    });
    it('updates first account with id as part of body', (done) => {
      standard.update({id: dbData.testAccount1.Item.id}, {id: dbData.testAccount1.Item.id, email: 'test@test.com'}).then((data) => {
        expect(data.email).to.be.equal('test@test.com');
        done();
      });
    });
    it('updates account with two values', (done) => {
      standard.update({id: dbData.testAccount1.Item.id}, {email: 'test@test.com', firstName: 'jeb'}).then((data) => {
        expect(data.email).to.be.equal('test@test.com');
        done();
      });
    });
    it('fails to update with invalid data', (done) => {
      standard.update({id: dbData.testAccount1.Item.id}, {email: 'test@test.com', failValidate: true}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
    it('fails to update with bad data', (done) => {
      standard.update({junk: 'trash'}, {email: 'test@test.com'}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('delete', () => {
    it('deletes first account', (done) => {
      standard.delete({id: dbData.testAccount1.Item.id}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
    it('deletes second account', (done) => {
      standard.delete({id: dbData.testAccount2.Item.id}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
    it('fails to delete with bad data', (done) => {
      standard.delete({junk: 'trash'}).then(done).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });
  describe('remove table', () => {
    it('removes the test table', (done) => {
      standard.deleteTable({TableName: dbData.testModel.tableName}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });
  describe('extend', () => {
    it('extends the adapter with a new method', () => {
      // Extend
      standard.extend('sayFoo', () => {
        return 'foo';
      });
      // Execute
      expect(standard.sayFoo()).to.equal('foo');
    });
  });

  describe('autocreate coverage', () => {
    it('Fails to create on non-existent table', (done) => {
      numeric.deleteTable({TableName: dbData.testNumericModel.tableName}).then(() => {
        numeric.create(dbData.numericAccount.Item, '1').then((data) => {
          done(data);
        }).catch(() => {
          done();
        });
      });
    });

    it('Successfully creates first account on tables from post', (done) => {
      standard.create(dbData.testAccount1.Item, '1').then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });

    it('Successfully creates second account on autocreated table', (done) => {
      standard.create(dbData.testAccount2.Item, '1').then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });

    it('removes autocreated test table', (done) => {
      standard.deleteTable({TableName: dbData.testModel.tableName}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });
});
