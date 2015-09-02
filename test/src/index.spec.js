/* eslint no-unused-expressions: 0 */
/* global expect, request, describe, it, before, after */
import '../setup';
import DynamoAdapter from '../../src/index.js';
import { testAccount1, testAccount2, testModel, testNumericModel, numericAccount} from './test-data';

let dynamoConfig = {
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '123456789',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '123456789'
};

const standard = new DynamoAdapter(dynamoConfig);
const numeric = new DynamoAdapter(dynamoConfig);

numeric.setSchema('1', testNumericModel);
standard.setSchema('1', testModel);


const validate = (body) => {
  // Test validation failure by passing `failValidate: true`
  if (body.Item.failValidate) {
    return { error: true };
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

describe('dynamo numeric tests', () => {
  describe('get schema', () => {
    it('Checks the schema', (done) => {
      expect(numeric.getSchema()).to.be.an.object;
      done();
    })
  });

  describe('table', () => {
    it('creates the numeric test table', (done) => {
      numeric.createTableFromModel().then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });

  describe('create', () => {
    it('Creates first entry', (done) => {
      numeric.create(numericAccount.Item, '1').then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });

  describe('fail validation', () => {
    it('Hardcode failure params to fail', (done) => {
      numericAccount.Item.failValidate = true;
      numeric.create(numericAccount.Item).then(done).catch((err) => {
        console.log('Failed', err);
        delete numericAccount.Item.failValidate;
        expect(err).to.be.an.instanceof(Error);
        done()
      });
    });
  });

  describe('fail create', () => {
    it('Creates invalid params to fail', (done) => {
      numeric.create({lol: 'trash'}).then(done).catch((err) => {
        console.log('Got a proper fail', err);
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  });

  describe('read', () => {
    it('reads by numeric hash', (done) => {
      numeric.read({'id': numericAccount.Item.id}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });

    it('reads by numeric secondary', (done) => {
      numeric.read({'age': numericAccount.Item.age}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });

  describe('remove table', () => {
    it('removes the numeric test table', (done) => {
      numeric.deleteTable({TableName: testNumericModel.tableName}).then((data) => {
        expect(data).to.be.an.object;
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

  describe('create', () => {
    it('Creates first entry', (done) => {
      standard.create(testAccount1.Item,'1').then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });

  describe('create', () => {
    it('Creates second entry', (done) => {
      standard.create(testAccount2.Item,'1').then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });

  describe('scan', () => {
    it('scans dynamo user table', (done) => {
      standard.scan().then((data) => {
        expect(data.length).to.be.above(0);
        done();
      });
    });
  });

  describe('read', () => {
    it('reads by hash', (done) => {
      standard.read({'id': testAccount1.Item.id}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });

    it('reads by secondary', (done) => {
      standard.read({'authId': testAccount1.Item.authId}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });

  describe('get in array', () => {
    it('fetches items by array', (done) => {
      standard.getItemsInArray('id', [testAccount1.Item.id, testAccount2.Item.id]).then((data) => {
        expect(data).to.be.an.array;
        done();
      });
    });
  });

  describe('update', () => {
    it('updates first account', (done) => {
      standard.update({id: testAccount1.Item.id}, {email: 'test@test.com'}).then((data) => {
        expect(data.email).to.be.equal('test@test.com');
        done();
      });
    });
  });

  describe('delete', () => {
    it('deletes first account', (done) => {
      standard.delete({id: testAccount1.Item.id}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });

    it('deletes second account', (done) => {
      standard.delete({id: testAccount2.Item.id}).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });

  describe('remove table', () => {
    it('removes the test table', (done) => {
      standard.deleteTable({TableName: testModel.tableName}).then((data) => {
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
});
