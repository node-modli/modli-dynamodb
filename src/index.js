const Promise = require('bluebird');
const _ = require('lodash');
import { tables } from './dynamo-data';
import { helpers } from './helpers';
let AWS = require('aws-sdk');
let DOC = require('dynamodb-doc');

/**
 * Class constructor
 * @class dynamodb
 */
export default class {
  constructor(config) {
    this.schemas = {};
    const dynDb = new AWS.DynamoDB(config);
    this.ddb = new DOC.DynamoDB(dynDb);
  }

  /**
   * Sets the schema for the model
   * @memberof dynamodb
   * @param {String} version The version of the model
   * @param {Object} schema Json Object with schema information
   */
  setSchema(schema, version) {
    this.defaultVersion = version;
    this.schemas[version] = schema;
  }

  /**
   * Returns the active schema
   * @memberof dynamodb
   * @returns {Object} Current JSON Schema Object
   */
  getSchema() {
    return this.schemas;
  }

  /**
   * Generates a secondary index for a new table
   * @memberof dynamodb
   * @param {Object} Parameters to deterministically generate a secondary index
   * @returns {Object} New Index
   */
  generateSecondaryIndex(params) {
    let newIndex = Object.create({});
    newIndex = _.clone(tables.secondaryIndex, true);
    if (params.projectionType) {
      newIndex.Projection.ProjectionType = params.projectionType;
      if (params.nonKeyAttributes) {
        if (params.projectionType === 'INCLUDE') {
          newIndex.Projection.NonKeyAttributes = params.nonKeyAttributes;
        }
        delete params.nonKeyAttributes;
      }
      delete params.projectionType;
    }
    newIndex.IndexName = params.value + '-index';
    newIndex.KeySchema.push(this.generateKey(params));
    return newIndex;
  }

  /**
   * Generates a definition for a create call
   * @memberof dynamodb
   * @param {Object} Parameters to deterministically generate a definition
   * @returns {Object} New Definition
   */
  generateDefinition(params) {
    let newDefinition = _.clone(tables.attribute, true);
    newDefinition.AttributeName = params.value;
    newDefinition.AttributeType = params.type;
    return newDefinition;
  }

  /**
   * Generates a key for a create call
   * @memberof dynamodb
   * @param {Object} params Parameters to deterministically generate a key
   * @returns {Object} New attribute
   */
  generateKey(params) {
    let newAtrribute = _.clone(tables.keyData, true);
    newAtrribute.AttributeName = params.value;
    newAtrribute.KeyType = (params.keytype === 'range') ? 'RANGE' : 'HASH';
    return newAtrribute;
  }

  /**
   * Creates a new entry in the database
   * @memberof dynamodb
   * @param {Object} body Contents to create entry
   * @returns {Object} promise
   */
  create(body, paramVersion = false) {
    return new Promise((resolve, reject) => {
      helpers.checkCreateTable(this, paramVersion).then(() => {
        const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
        const validationErrors = this.validate(body, version);
        if (validationErrors) {
          throw new Error('Modli Errors: ' + validationErrors);
        } else {
          const createParams = {
            TableName: this.schemas[version].tableName,
            ReturnValues: 'ALL_OLD',
            Item: body
          };
          this.ddb.putItem(createParams, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(body);
            }
          });
        }
      }).catch(reject);
    });
  }

  /**
   * Calls create table using explcit table creation parameters
   * @memberof dynamodb
   * @param {Object} body Contents to create table
   * @returns {Object} promise
   */
  createTable(params) {
    return new Promise((resolve, reject) => {
      this.ddb.listTables({}, (err, foundTables) => {
        let tableList;
        tableList = foundTables || { TableNames: [] };
        if (_.contains(tableList.TableNames, params.TableName)) {
          resolve({TableName: params.TableName, existed: true});
        } else {
          this.ddb.createTable(params, (createErr, res) => {
            if (createErr) {
              reject(createErr);
            } else {
              resolve(res);
            }
          });
        }
      });
    });
  }

  /**
   * Deterministic method to call create table using the model as the reference
   * @memberof dynamodb
   * @returns {Object} promise
   */
  createTableFromModel(paramVersion = false) {
    const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
    let newTable = _.clone(tables.table, true);
    newTable.Table.TableName = this.schemas[version].tableName;
    _.each(this.schemas[version].indexes, (row) => {
      newTable.Table.AttributeDefinitions.push(this.generateDefinition(row));
      if (row.keytype === 'hash') {
        newTable.Table.KeySchema.push(this.generateKey(row));
      } else if (row.keytype === 'secondary') {
        newTable.Table.GlobalSecondaryIndexes.push(this.generateSecondaryIndex(row));
      } else {
        return new Error({ error: 'Model has invalid index'});
      }
    });
    if (newTable.Table.GlobalSecondaryIndexes.length < 1) {
      delete (newTable.Table.GlobalSecondaryIndexes);
    }
    return this.createTable(newTable.Table);
  }

  /**
   * Deterministic method to call create table using the model as the reference
   * @memberof dynamodb
   * @param {Object} params Parameters to find table and delete by
   *   @property {TableName: VALUE}
   * @returns {Object} promise
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
   * Creates a compatible filter to apply to scanned returns
   * @memberof dynamodb
   * @returns {Object} scan ready filter object
   */
  createFilter(table, filterObject) {
    const newFilter = { 'TableName': table };
    const returnFilter = _.extend(newFilter, helpers.createExpression(newFilter, filterObject));
    return returnFilter;
  }

  /**
   * Performs a full unfiltered scan
   * @memberof dynamodb
   * @returns {Object} promise
   */
  scan(filterObject, paramVersion = false) {
    return new Promise((resolve, reject) => {
      helpers.checkCreateTable(this, paramVersion).then(() => {
        const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
        const table = this.schemas[version].tableName;
        let scanObject = {'TableName': table};
        if (filterObject) {
          scanObject = this.createFilter(table, filterObject);
        }
        this.ddb.scan(scanObject, (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.Items);
          }
        });
      });
    });
  }

  /**
   * Gets a list of available tables
   * @memberof dynamodb
   * @returns {Object} promise
   */
  list() {
    return new Promise((resolve, reject) => {
      this.ddb.listTables({}, (err, res) => {
        /* istanbul ignore if */
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
   * @memberof dynamodb
   * @param {Object} obj
   *   @property {string} hash/index - Example { authId: '1234'}
   * @returns {Object} promise
   */
  read(obj, paramVersion = false) {
    return new Promise((resolve, reject) => {
      helpers.checkCreateTable(this, paramVersion).then(() => {
        const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
        const key = Object.keys(obj)[0];
        let itemPromise = null;
        let type = null;

        _.each(this.schemas[version].indexes, function(row) {
          if (row.value === key) {
            type = row.keytype;
            return false;
          }
        });

        if (!type) {
          reject(new Error('No type'));
        } else {
          if (type === 'hash') {
            itemPromise = this.getItemByHash(obj, version);
          } else {
            itemPromise = this.getItemById(obj, version);
          }
        }
        resolve(itemPromise);
      }).catch(reject);
    });
  }

  /**
   * Reads from the database by secondary index
   * @memberof dynamodb
   * @param {Object} obj The object to search by secondary index on
   *   @property {string} hash/index - Example { authId: '1234'}
   * @returns {Object} promise
   */
  getItemById(obj, paramVersion = false) {
    return new Promise((resolve, reject) => {
      helpers.checkCreateTable(this, paramVersion).then(() => {
        const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
        const table = this.schemas[version].tableName;
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
          let returnValue = null;
          if (err) {
            reject(err);
          } else {
            const cachedThis = this;
            returnValue = [];
            _.each(data.Items, function(row) {
              returnValue.push(cachedThis.sanitize(row));
            });
            resolve(returnValue);
          }
        });
      }).catch(reject);
    });
  }

  /**
    * Returns a list of objects in an array
    * @memberof dynamodb
    * @param {String} hash Name of the hash to search on
    * @param {Array} array Array of values to search in
    * @returns {Object} promise
    */
  getItemsInArray(hash, array, paramVersion = false) {
    return new Promise((resolve, reject) => {
      helpers.checkCreateTable(this, paramVersion).then(() => {
        const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
        if (!array) {
          reject(new Error('Array empty'));
        }
        if (array.length < 1) {
          reject(new Error('Array contained no values'));
        }
        const table = this.schemas[version].tableName;
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
            reject(new Error(err));
          } else {
            let returnArray = [];
            const sanitize = this.sanitize;
            _.each(data, function(row) {
              returnArray.push(sanitize(row));
            });
            resolve(returnArray);
          }
        });
      }).catch(reject);
    });
  }

  /**
   * Reads from the database by hash value
   * @memberof dynamodb
   * @param {Object} obj The hash object to search by
   *   @property {string} hash/index - Example { authId: '1234'}
   * @returns {Object} promise
   */
  getItemByHash(obj, paramVersion = false) {
    return new Promise((resolve, reject) => {
      helpers.checkCreateTable(this, paramVersion).then(() => {
        const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
        const table = this.schemas[version].tableName;
        const key = Object.keys(obj)[0];
        let params = {
          TableName: table,
          Key: {}
        };
        params.Key[key] = obj[key];
        this.ddb.getItem(params, (err, data) => {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(this.sanitize(data.Item));
          }
        });
      }).catch(reject);
    });
  }


  /**
   * Updates an entry in the database
   * @memberof dynamodb
   * @param {Object} hashObject The object to search for to update
   *   @property {string} hash/index - Example { authId: '1234'}
   * @param {Object} updatedValuesArray An array of values to update on the found row
   * @returns {Object} promise
   */
  update(hashObject, updatedValuesArray, paramVersion = false) {
    // TODO : Implement validation
    return new Promise((resolve, reject) => {
      helpers.checkCreateTable(this, paramVersion).then(() => {
        const hashkey = Object.keys(hashObject)[0];
        if (updatedValuesArray[hashkey]) {
          delete updatedValuesArray[hashkey];
        }
        const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
        const validationErrors = this.validate(updatedValuesArray, Object.keys(this.schemas)[0]);
        if (validationErrors) {
          reject(new Error(validationErrors));
        } else {
          const table = this.schemas[version].tableName;
          const key = Object.keys(hashObject)[0];

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
              reject(new Error(err));
            } else {
              resolve(data.Attributes);
            }
          });
        }
      }).catch(reject);
    });
  }

  /**
   * Deletes an item from the database
   * @memberof dynamodb
   * @param {Object} hashObject The object to find by hash, to delete
   *   @property {string} hash/index - Example { authId: '1234'}
   * @returns {Object} promise
   */
  delete(hashObject, paramVersion = false) {
    return new Promise((resolve, reject) => {
      helpers.checkCreateTable(this, paramVersion).then(() => {
        const version = (paramVersion === false) ? this.defaultVersion : paramVersion;
        const key = Object.keys(hashObject)[0];
        const table = this.schemas[version].tableName;

        let params = {
          TableName: table,
          Key: {}
        };
        params.Key[key] = hashObject[key];
        this.ddb.deleteItem(params, (err, data) => {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(data);
          }
        });
      }).catch(reject);
    });
  }

  /**
  * Extends the dynamo object
  * @memberof dynamodb
  * @param {String} name The name of the method
  * @param {Function} fn The function to extend on the object
  */
  extend(name, fn) {
    this[name] = fn.bind(this);
  }
}
