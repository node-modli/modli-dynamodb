const Promise = require('bluebird');
const _ = require('lodash');
import { tables } from './dynamo-data';
let AWS = require('aws-sdk');
let DOC = require('dynamodb-doc');

/**
 * Default class for the DynamoAdapter
 */
export default class {
  constructor(config) {
    AWS.config.update(config);
    this.schemas = {};
    this.ddb = new DOC.DynamoDB();
  }

  /*
   * Sets the schema the model
   * Makes deterministic calls and validation possible
   *
   */
  setSchema(version, schema) {
    this.schemas[version] = schema;
  }

  /*
   * Helper Method
   * Returns the active schema
   *
   */
  getSchema() {
    return this.schemas;
  }

  /*
   * Helper Method
   * Generates a secondary index for a new table
   *
   */
  generateSecondaryIndex(params) {
    let newIndex = Object.create({});
    try {
      newIndex = _.clone(tables.secondaryIndex, true);
      newIndex.IndexName = params.value + '-index';
      newIndex.KeySchema.push(this.generateKey(params));
      return newIndex;
    } catch (err) {
      return err;
    }
    return newIndex;
  }

  /*
   * Helper Method
   * Generates a definition for a create call
   *
   */
  generateDefinition(params) {
    let newDefinition = _.clone(tables.attribute, true);
    newDefinition.AttributeName = params.value;
    newDefinition.AttributeType = params.type;
    return newDefinition;
  }

  /*
   * Helper Method
   * Generates a key for a create call
   *
   */
  generateKey(params) {
    let newAtrribute = _.clone(tables.keyData, true);
    newAtrribute.AttributeName = params.value;
    newAtrribute.KeyType = (params.keytype === 'range') ? 'RANGE' : 'HASH';
    return newAtrribute;
  }

  /**
   * Creates a new entry in the database
   * @memberof dynamo
   * @param {Object} body Contents to create entry
   * @returns {Object} promise
   */
  create(body) {
    return new Promise((resolve, reject) => {
      try {
        const createParams = {
          TableName: this.schemas['1'].tableName,
          ReturnValues: 'ALL_OLD',
          Item: body
        };
        const validationErrors = false;

        if (validationErrors) {
          reject(validationErrors);
        } else {
          this.ddb.putItem(createParams, function(err, data) {
            if (err) {
              reject(data);
            } else {
              resolve(data);
            }
          });
        }
      } catch (exception) {
        reject('Create Exception: ' + exception);
      }
    });
  }

  /**
   * Passthrough method
   * @memberof dynamo
   * Calls create table using explcit table creation parameters
   * @params {Object} body Contents to create table
   * @returns {Object} promise
   */
  createTable(params) {
    return new Promise((resolve, reject) => {
      this.ddb.createTable(params, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  /**
   * Deterministic method to call create table using the model as the reference
   * @memberof dynamo
   * @returns {Object} promise
   */
  createTableFromModel() {
    let newTable = _.clone(tables.table, true);
    newTable.Table.TableName = this.schemas['1'].tableName;
    _.each(this.schemas['1'].indexes, (row) => {
      newTable.Table.AttributeDefinitions.push(this.generateDefinition(row));
      if (row.keytype === 'hash') {
        newTable.Table.KeySchema.push(this.generateKey(row));
      } else if (row.keytype === 'secondary') {
        newTable.Table.GlobalSecondaryIndexes.push(this.generateSecondaryIndex(row));
      } else {
        return ({ error: 'Model has invalid index'});
      }
    });
    if (newTable.Table.GlobalSecondaryIndexes.length < 1) {
      delete (newTable.Table.GlobalSecondaryIndexes);
    }
    return this.createTable(newTable.Table);
  }

  /**
   * Deterministic method to call create table using the model as the reference
   * @memberof dynamo
   * @params {HASHNAME: VALUE}
   * @returns {Object} promise - {}
   */
  deleteTable(params) {
    return new Promise((resolve, reject) => {
      this.ddb.deleteTable(params, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }


  /**
   * Performs a full unfiltered scan
   * @memberof dynamo
   * @returns {Object} promise - array of items
   */
  scan() {
    return new Promise((resolve, reject) => {
      const table = this.schemas['1'].tableName;
      if (!table) {
        reject('No table defined');
      }
      this.ddb.scan({'TableName': table}, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.Items);
        }
      });
    });
  }

  /**
   * Gets a list of available tables
   * @memberof dynamo
   * @returns {Object} promise - Array of tables
   */
  list() {
    return new Promise((resolve, reject) => {
      this.ddb.listTables({}, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  /**
   * Deterministic method to read a value from an object.
   * Will use the model as a reference to construct the proper query
   * @memberof dynamo
   * @params {HASHNAME/SECONDARYINDEX NAME: VALUE}
   * @returns {Object} promise
   */
  read(obj) {
    const key = Object.keys(obj)[0];
    let itemPromise = null;
    let type = null;

    _.each(this.schemas['1'].indexes, function(row) {
      if (row.value === key) {
        type = row.keytype;
        return false;
      }
    });

    if (!type) {
      itemPromise = {error: 'No type'};
    } else {
      if (type === 'hash') {
        itemPromise = this.getItemByHash(obj);
      } else {
        itemPromise = this.getItemById(obj);
      }
    }
    return itemPromise;
  }

  /**
   * Reads from the database by secondary index
   * @memberof dynamo
   * @params {HASHNAME/SECONDARYINDEX NAME: VALUE}
   * @returns {Object} promise
   */
  getItemById(obj) {
    return new Promise((resolve, reject) => {
      const table = this.schemas['1'].tableName;
      if (!table) {
        reject('No table defined');
      }
      const key = Object.keys(obj)[0];
      const params = {
        TableName: table,
        IndexName: key + '-index',
        KeyConditionExpression: key + ' = :hk_val',
        ExpressionAttributeValues: {
          ':hk_val': obj[key]
        }
      };

      this.ddb.query(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
    * Returns a list of objects in an array
    * Searched by the hashObject
    * Example: getItemsInArray('id',[1,2,3,4])
    * @memberof dynamo
    * @params {HASHNAME/SECONDARYINDEX NAME: VALUE}
    * @returns {Object} promise
    */
  getItemsInArray(hash, array) {
    return new Promise((resolve, reject) => {
      if (!array) {
        reject('Array empty');
        return false;
      }
      if (array.length < 1) {
        reject('Array contained no values');
        return false;
      }
      const table = this.schemas['1'].tableName;
      if (!table) {
        reject('No table defined');
      }

      let params = {
        RequestItems: {}
      };

      params.RequestItems[table] = {
        Keys: []
      };

      _.each(array, (val) => {
        let newObj = Object.create({});
        newObj[hash] = val;
        params.RequestItems[table].Keys.push(newObj);
      });

      this.ddb.batchGetItem(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Reads from the database by hash value
   * @memberof dynamo
   * @param {Object} query Specific id or query to construct read
   * @returns {Object} promise
   */
  // TODO: Test this with numeric indexes..
  getItemByHash(obj) {
    return new Promise((resolve, reject) => {
      const table = this.schemas['1'].tableName;
      if (!table) {
        reject('No table defined');
      }
      const key = Object.keys(obj)[0];
      let params = {
        TableName: table,
        Key: {}
      };
      params.Key[key] = obj[key];
      this.ddb.getItem(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }


  /**
   * Updates an entry in the database
   * @memberof dynamo
   * @param {String} query Query to locate entries to update
   * @param {Object} body Contents to update
   * @returns {Object} promise
   */
  update(hashObject, updatedValuesArray) {
    // TODO : Implement validation
    return new Promise((resolve, reject) => {
      const validationErrors = false;

      if (validationErrors) {
        reject(validationErrors);
      } else {
        const table = this.schemas['1'].tableName;
        const key = Object.keys(hashObject)[0];
        if (!table) {
          reject('No table defined');
        }
        let params = {
          TableName: table,
          Key: {},
          // Assume a minimum of one param set
          UpdateExpression: 'SET #param1 = :val1',
          ExpressionAttributeNames: {
          },
          ExpressionAttributeValues: {
          },
          ReturnValues: 'ALL_NEW',
          ReturnConsumedCapacity: 'NONE',
          ReturnItemCollectionMetrics: 'NONE'
        };
        params.Key[key] = hashObject[key];

        let i = 0;
        Object.keys(updatedValuesArray).forEach((valueKey) => {
          i++;
          params.ExpressionAttributeNames['#param' + i] = valueKey;
          params.ExpressionAttributeValues[':val' + i] = updatedValuesArray[valueKey];
          if (i > 1) {
            params.UpdateExpression += ', #param' + i + ' = :val' + i;
          }
        });
        this.ddb.updateItem(params, function(err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data.Attributes);
          }
        });
      }
    });
  }

  /**
   * Deletes an item from the database
   * @memberof dynamo
   * @param {Object} query Query to locate entries to delete
   * @returns {Object} promise
   */
  delete(hashObject) {
    return new Promise((resolve, reject) => {
      const key = Object.keys(hashObject)[0];
      const table = this.schemas['1'].tableName;
      if (!table) {
        reject('No table defined');
      }
      let params = {
        TableName: table,
        Key: {}
      };
      params.Key[key] = hashObject[key];
      this.ddb.deleteItem(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
  * Extends the dynamo object
  * @memberof dynamo
  * @param {String} name The name of the method
  * @param {Function} fn The function to extend on the object
  */
  extend(name, fn) {
    this[name] = fn.bind(this);
  }
}
