/* eslint no-unused-expressions: 0 */
/* global expect, request, describe, it, before, after */
import '../setup';
import { adapter, model, use } from '../../src/index';
import { testAccount1, testAccount2, testModel, testNumericModel, numericAccount} from './test-data';

let dynamoConfig = {
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '123456789',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '123456789'
};


describe('dynamo numeric tests', () => {
  let dynamoNumAdapter = null;

  const testNumericAdapter = {
    name: 'DynamoDB',
    source: 'dynamo',
    config: dynamoConfig,
    table: 'numusers'
  };

  describe('add', () => {
    // Fail on missing params
    it('fails if missing properties in the adapter object', () => {
      try {
        adapter.add({});
      } catch (e) {
        expect(e).to.be.an.instanceof(Error);
      }
    });
    // Add to store
    it('adds a new adapter entry to the adapter object store', () => {
      adapter.add(testNumericAdapter);
      expect(adapter.store).to.have.property(testNumericAdapter.name);
      expect(adapter.store[testNumericAdapter.name]).to.be.an.object;
    });
  });

  describe('numeric model', () => {
    it('adds a model to the adapter', () => {
      model.add(testNumericModel);
      expect(model.store.numuser).to.be.an.object;
    });

    describe('use', () => {
      it('creates an instance', () => {
        dynamoNumAdapter = use(testNumericModel.name, 'DynamoDB');
        expect(dynamoNumAdapter).to.be.an.object;
      });
    });

    describe('table', () => {
      it('creates the numeric test table', (done) => {
        dynamoNumAdapter.createTableFromModel().then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });

    describe('create', () => {
      it('Creates first entry', (done) => {
        dynamoNumAdapter.create(numericAccount.Item).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });

    describe('read', () => {
      it('reads by numeric hash', (done) => {
        dynamoNumAdapter.read({'id': numericAccount.Item.id}).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });

      it('reads by numeric secondary', (done) => {
        dynamoNumAdapter.read({'age': numericAccount.Item.age}).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });

    describe('remove table', () => {
      it('removes the numeric test table', (done) => {
        dynamoNumAdapter.deleteTable({TableName: testNumericModel.tableName}).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });
  });
});

describe('dynamo full tests', () => {
  let dynamoAdapter = null;

  const testAdapter = {
    name: 'DynamoDB',
    source: 'dynamo',
    config: dynamoConfig,
    table: 'tmpusers'
  };

  describe('add', () => {
    // Fail on missing params
    it('fails if missing properties in the adapter object', () => {
      try {
        adapter.add({});
      } catch (e) {
        expect(e).to.be.an.instanceof(Error);
      }
    });
    // Add to store
    it('adds a new adapter entry to the adapter object store', () => {
      adapter.add(testAdapter);
      expect(adapter.store).to.have.property(testAdapter.name);
      expect(adapter.store[testAdapter.name]).to.be.an.object;
    });
  });

  describe('standard model', () => {
    it('adds a model to the adapter', () => {
      model.add(testModel);
      expect(model.store.tmpuser).to.be.an.object;
    });

    describe('use', () => {
      it('creates an instance', () => {
        dynamoAdapter = use(testModel.name, 'DynamoDB');
        expect(dynamoAdapter).to.be.an.object;
      });
    });

    describe('table', () => {
      it('creates the users table', (done) => {
        dynamoAdapter.createTableFromModel().then((data) => {
          expect(data).to.be.an.object;
          done();
        }).catch((err) => {
          done(err);
        });
      });
    });

    describe('list', () => {
      it('lists tables', (done) => {
        dynamoAdapter.list().then((data) => {
          expect(data.TableNames.length).to.be.above(0);
          done();
        });
      });
    });

    describe('create', () => {
      it('Creates first entry', (done) => {
        dynamoAdapter.create(testAccount1.Item).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });

    describe('create', () => {
      it('Creates second entry', (done) => {
        dynamoAdapter.create(testAccount2.Item).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });

    describe('scan', () => {
      it('scans dynamo user table', (done) => {
        dynamoAdapter.scan().then((data) => {
          expect(data.length).to.be.above(0);
          done();
        });
      });
    });

    describe('read', () => {
      it('reads by hash', (done) => {
        dynamoAdapter.read({'id': testAccount1.Item.id}).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });

      it('reads by secondary', (done) => {
        dynamoAdapter.read({'authId': testAccount1.Item.authId}).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });

    describe('get in array', () => {
      it('fetches items by array', (done) => {
        dynamoAdapter.getItemsInArray('id', [testAccount1.Item.id, testAccount2.Item.id]).then((data) => {
          expect(data).to.be.an.array;
          done();
        });
      });
    });

    describe('update', () => {
      it('updates first account', (done) => {
        dynamoAdapter.update({id: testAccount1.Item.id}, {email: 'test@test.com'}).then((data) => {
          expect(data.email).to.be.equal('test@test.com');
          done();
        });
      });
    });

    describe('delete', () => {
      it('deletes first account', (done) => {
        dynamoAdapter.delete({id: testAccount1.Item.id}).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });

      it('deletes second account', (done) => {
        dynamoAdapter.delete({id: testAccount2.Item.id}).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });

    describe('remove table', () => {
      it('removes the test table', (done) => {
        dynamoAdapter.deleteTable({TableName: testModel.tableName}).then((data) => {
          expect(data).to.be.an.object;
          done();
        });
      });
    });
  });
});
