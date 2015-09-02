/* eslint no-unused-expressions: 0 */
/* global expect, request, describe, it, before, after */
import '../setup';
import { dynamo } from '../../src/index.js';
import { testAccount1, testAccount2, testModel, testNumericModel, numericAccount} from './test-data';
const _ = require('lodash');


let dynamoConfig = {
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '123456789',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '123456789'
};

dynamo.config(dynamoConfig);
dynamo.schemas = {};


describe('dynamo numeric tests', () => {
  let numeric = Object.create({});
  numeric = _.extend({}, dynamo);
  numeric.schemas['1'] = testNumericModel;

  describe('table', () => {
    console.log('I have numeric', numeric.schemas);
    it('creates the numeric test table', (done) => {
      numeric.createTableFromModel().then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });
  
  describe('create', () => {
    it('Creates first entry', (done) => {
      numeric.create(numericAccount.Item).then((data) => {
        expect(data).to.be.an.object;
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
  // Set standard model
  let standard = _.extend({}, dynamo);
  standard.schemas['1'] = testModel;
  
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
      standard.create(testAccount1.Item).then((data) => {
        expect(data).to.be.an.object;
        done();
      });
    });
  });

  describe('create', () => {
    it('Creates second entry', (done) => {
      standard.create(testAccount2.Item).then((data) => {
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
});
