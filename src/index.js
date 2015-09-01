const Promise = require('bluebird');
const _ = require('lodash');
import { tables } from './dynamo-data';
let AWS = require('aws-sdk');
let DOC = require('dynamodb-doc');
let ddb = null;

/**
 * @namespace dynamo
 */
export const dynamo = {};

/**
 * Accepts config parameters
 * @memberof dynamo
 * @param {Object} cfg Configuration
 * Refer to : https://github.com/totemstech/node-dynamodb for config settings
 */
dynamo.config = (cfg) => {
  try {
    AWS.config.update(cfg);
    // Need to promisify this?
    ddb = new DOC.DynamoDB();
    return true;
  } catch (exception) {
    return false;
  }
};
/*
 *
 * Deletes a table
 *
 */

dynamo.deleteTable = (params) => {
  return new Promise((resolve, reject) => {
    ddb.deleteTable(params, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * Creates a new table explicity based on incoming pararms
 *
 */
dynamo.createTable = (params) => {
  return new Promise((resolve, reject) => {
    ddb.createTable(params, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

/*
 *
 * Exec - Passthrough "query"
 *
 */
dynamo.exec = (params) => {
  return new Promise((resolve, reject) => {
    ddb.query(params, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

dynamo.generateSecondaryIndex = (params) => {
  let newIndex = Object.create({});
  try {
    newIndex = _.clone(tables.secondaryIndex, true);
    newIndex.IndexName = params.value + '-index';
    newIndex.KeySchema.push(dynamo.generateKey(params));
    return newIndex;
  } catch (err) {
    return err;
  }
  return newIndex;
};

dynamo.generateDefinition = (params) => {
  let newDefinition = _.clone(tables.attribute, true);
  newDefinition.AttributeName = params.value;
  newDefinition.AttributeType = params.type;
  return newDefinition;
};

// TODO: Test with ranges
dynamo.generateKey = (params) => {
  let newAtrribute = _.clone(tables.keyData, true);
  newAtrribute.AttributeName = params.value;
  newAtrribute.KeyType = (params.keytype === 'range') ? 'RANGE' : 'HASH';
  return newAtrribute;
};

/**
 * Creates a table, by analyzing the model
 */
dynamo.createTableFromModel = () => {
  let newTable = _.clone(tables.table, true);
  newTable.Table.TableName = dynamo.schemas['1'].tableName;
  _.each(dynamo.schemas['1'].indexes, (row) => {
    newTable.Table.AttributeDefinitions.push(dynamo.generateDefinition(row));
    if (row.keytype === 'hash') {
      newTable.Table.KeySchema.push(dynamo.generateKey(row));
    } else if (row.keytype === 'secondary') {
      newTable.Table.GlobalSecondaryIndexes.push(dynamo.generateSecondaryIndex(row));
    } else {
      return ({ error: 'Model has invalid index'});
    }
  });
  return dynamo.createTable(newTable.Table);
};

/**
 * Creates a new entry in the database
 * @memberof dynamo
 * @param {Object} body Contents to create entry
 * @returns {Object} promise
 */
// TODO: Double check validation
dynamo.create = (body) => {
    // Return promise
  return new Promise((resolve, reject) => {
    try {
      const createParams = {
        TableName: dynamo.schemas['1'].tableName,
        ReturnValues: 'ALL_OLD',
        Item: body
      };
      const validationErrors = false;

      // TODO: Fix validation
      // const validationErrors = dynamo.validate(body);
      /* istanbul ignore if */
      if (validationErrors) {
        reject(validationErrors);
      } else {
        ddb.putItem(createParams, function(err, data) {
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
};

/**
  * Performs a full scan
  */
dynamo.scan = () => {
  return new Promise((resolve, reject) => {
    const table = dynamo.schemas['1'].tableName;
    if (!table) {
      reject('No table defined');
    }
    ddb.scan({'TableName': table}, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.Items);
      }
    });
  });
};

/**
  * Gets a list of the tables
  */
dynamo.list = () => {
  return new Promise((resolve, reject) => {
    ddb.listTables({}, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

dynamo.read = (obj) => {
  const key = Object.keys(obj)[0];
  let itemPromise = null;
  let type = null;

  _.each(dynamo.schemas['1'].indexes, function(row) {
    if (row.value === key) {
      type = row.keytype;
      return false;
    }
  });

  if (!type) {
    itemPromise = {error: 'No type'};
  } else {
    if (type === 'hash') {
      itemPromise = dynamo.getItemByHash(obj);
    } else {
      itemPromise = dynamo.getItemById(obj);
    }
  }
  return itemPromise;
};

/**
 * Reads from the database by secondary index
 * @memberof dynamo
 * @param {Object} query Specific id or query to construct read
 * @returns {Object} promise
 */
dynamo.getItemById = (obj) => {
  return new Promise((resolve, reject) => {
    const table = dynamo.schemas['1'].tableName;
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

    ddb.query(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

dynamo.getItemsInArray = (hash, array) => {
  return new Promise((resolve, reject) => {
    if (!array) {
      reject('Array empty');
      return false;
    }
    if (array.length < 1) {
      reject('Array contained no values');
      return false;
    }
    const table = dynamo.schemas['1'].tableName;
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

    ddb.batchGetItem(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
/**
 * Reads from the database by hash value
 * @memberof dynamo
 * @param {Object} query Specific id or query to construct read
 * @returns {Object} promise
 */
// TODO: Test this with numeric indexes..
dynamo.getItemByHash = (obj) => {
  return new Promise((resolve, reject) => {
    const table = dynamo.schemas['1'].tableName;
    if (!table) {
      reject('No table defined');
    }
    const key = Object.keys(obj)[0];
    let params = {
      TableName: table,
      Key: {}
    };
    params.Key[key] = obj[key];
    ddb.getItem(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};


/**
 * Updates an entry in the database
 * @memberof dynamo
 * @param {String} query Query to locate entries to update
 * @param {Object} body Contents to update
 * @returns {Object} promise
 */
dynamo.update = (hashObject, updatedValuesArray) => {
  // TODO: Self deterministic figure out the key and update by that
  // TODO : Implement validation
  // Return promise
  return new Promise((resolve, reject) => {
    const validationErrors = false;

    if (validationErrors) {
      reject(validationErrors);
    } else {
      const table = dynamo.schemas['1'].tableName;
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
      ddb.updateItem(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data.Attributes);
        }
      });
    }
  });
};

/**
 * Deletes an item from the database
 * @memberof dynamo
 * @param {Object} query Query to locate entries to delete
 * @returns {Object} promise
 */
dynamo.delete = (hashObject) => {
  return new Promise((resolve, reject) => {
    const key = Object.keys(hashObject)[0];
    const table = dynamo.schemas['1'].tableName;
    if (!table) {
      reject('No table defined');
    }
    let params = {
      TableName: table,
      Key: {}
    };
    params.Key[key] = hashObject[key];
    ddb.deleteItem(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
/**
 * Extends adapter by adding new method
 * @memberof dynamo
 * @param {String} name The name of the method
 * @param {Function} fn The method to add
 */
dynamo.extend = (name, fn) => {
  dynamo[name] = fn.bind(dynamo);
};
