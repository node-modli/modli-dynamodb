'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _dynamoData = require('./dynamo-data');

var Promise = require('bluebird');
var _ = require('lodash');

var AWS = require('aws-sdk');
var DOC = require('dynamodb-doc');
var ddb = null;

/**
 * @namespace dynamo
 */
var dynamo = {};

exports.dynamo = dynamo;
/**
 * Accepts config parameters
 * @memberof dynamo
 * @param {Object} cfg Configuration
 * Refer to : https://github.com/totemstech/node-dynamodb for config settings
 */
dynamo.config = function (cfg) {
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

dynamo.deleteTable = function (params) {
  return new Promise(function (resolve, reject) {
    ddb.deleteTable(params, function (err, res) {
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
dynamo.createTable = function (params) {
  return new Promise(function (resolve, reject) {
    ddb.createTable(params, function (err, res) {
      console.log('Params:', params);
      if (err) {
        console.log('Got reject:', err);
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
dynamo.exec = function (params) {
  return new Promise(function (resolve, reject) {
    ddb.query(params, function (err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

dynamo.generateSecondaryIndex = function (params) {
  var newIndex = Object.create({});
  try {
    newIndex = _.clone(_dynamoData.tables.secondaryIndex, true);
    newIndex.IndexName = params.value + '-index';
    newIndex.KeySchema.push(dynamo.generateKey(params));
    return newIndex;
  } catch (err) {
    return err;
  }
  return newIndex;
};

dynamo.generateDefinition = function (params) {
  var newDefinition = _.clone(_dynamoData.tables.attribute, true);
  newDefinition.AttributeName = params.value;
  newDefinition.AttributeType = params.type;
  return newDefinition;
};

// TODO: Test with ranges
dynamo.generateKey = function (params) {
  var newAtrribute = _.clone(_dynamoData.tables.keyData, true);
  newAtrribute.AttributeName = params.value;
  newAtrribute.KeyType = params.keytype === 'range' ? 'RANGE' : 'HASH';
  return newAtrribute;
};

/**
 * Creates a table, by analyzing the model
 */
dynamo.createTableFromModel = function () {
  var newTable = _.clone(_dynamoData.tables.table, true);
  console.log('Creaqting from ', dynamo.schemas);
  newTable.Table.TableName = dynamo.schemas['1'].tableName;
  _.each(dynamo.schemas['1'].indexes, function (row) {
    newTable.Table.AttributeDefinitions.push(dynamo.generateDefinition(row));
    if (row.keytype === 'hash') {
      newTable.Table.KeySchema.push(dynamo.generateKey(row));
    } else if (row.keytype === 'secondary') {
      newTable.Table.GlobalSecondaryIndexes.push(dynamo.generateSecondaryIndex(row));
    } else {
      return { error: 'Model has invalid index' };
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
dynamo.create = function (body) {
  // Return promise
  return new Promise(function (resolve, reject) {
    try {
      var createParams = {
        TableName: dynamo.schemas['1'].tableName,
        ReturnValues: 'ALL_OLD',
        Item: body
      };
      var validationErrors = false;

      // TODO: Fix validation
      // const validationErrors = dynamo.validate(body);
      /* istanbul ignore if */
      if (validationErrors) {
        reject(validationErrors);
      } else {
        ddb.putItem(createParams, function (err, data) {
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
dynamo.scan = function () {
  return new Promise(function (resolve, reject) {
    var table = dynamo.schemas['1'].tableName;
    if (!table) {
      reject('No table defined');
    }
    ddb.scan({ 'TableName': table }, function (err, res) {
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
dynamo.list = function () {
  return new Promise(function (resolve, reject) {
    ddb.listTables({}, function (err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

dynamo.read = function (obj) {
  var key = Object.keys(obj)[0];
  var itemPromise = null;
  var type = null;

  _.each(dynamo.schemas['1'].indexes, function (row) {
    if (row.value === key) {
      type = row.keytype;
      return false;
    }
  });

  if (!type) {
    itemPromise = { error: 'No type' };
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
dynamo.getItemById = function (obj) {
  return new Promise(function (resolve, reject) {
    var table = dynamo.schemas['1'].tableName;
    if (!table) {
      reject('No table defined');
    }
    var key = Object.keys(obj)[0];
    var params = {
      TableName: table,
      IndexName: key + '-index',
      KeyConditionExpression: key + ' = :hk_val',
      ExpressionAttributeValues: {
        ':hk_val': obj[key]
      }
    };

    ddb.query(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

dynamo.getItemsInArray = function (hash, array) {
  return new Promise(function (resolve, reject) {
    if (!array) {
      reject('Array empty');
      return false;
    }
    if (array.length < 1) {
      reject('Array contained no values');
      return false;
    }
    var table = dynamo.schemas['1'].tableName;
    if (!table) {
      reject('No table defined');
    }

    var params = {
      RequestItems: {}
    };

    params.RequestItems[table] = {
      Keys: []
    };

    _.each(array, function (val) {
      var newObj = Object.create({});
      newObj[hash] = val;
      params.RequestItems[table].Keys.push(newObj);
    });

    ddb.batchGetItem(params, function (err, data) {
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
dynamo.getItemByHash = function (obj) {
  return new Promise(function (resolve, reject) {
    var table = dynamo.schemas['1'].tableName;
    if (!table) {
      reject('No table defined');
    }
    var key = Object.keys(obj)[0];
    var params = {
      TableName: table,
      Key: {}
    };
    params.Key[key] = obj[key];
    ddb.getItem(params, function (err, data) {
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
dynamo.update = function (hashObject, updatedValuesArray) {
  // TODO: Self deterministic figure out the key and update by that
  // TODO : Implement validation
  // Return promise
  return new Promise(function (resolve, reject) {
    var validationErrors = false;

    if (validationErrors) {
      reject(validationErrors);
    } else {
      (function () {
        var table = dynamo.schemas['1'].tableName;
        var key = Object.keys(hashObject)[0];
        if (!table) {
          reject('No table defined');
        }
        var params = {
          TableName: table,
          Key: {},
          // Assume a minimum of one param set
          UpdateExpression: 'SET #param1 = :val1',
          ExpressionAttributeNames: {},
          ExpressionAttributeValues: {},
          ReturnValues: 'ALL_NEW',
          ReturnConsumedCapacity: 'NONE',
          ReturnItemCollectionMetrics: 'NONE'
        };
        params.Key[key] = hashObject[key];

        var i = 0;
        Object.keys(updatedValuesArray).forEach(function (valueKey) {
          i++;
          params.ExpressionAttributeNames['#param' + i] = valueKey;
          params.ExpressionAttributeValues[':val' + i] = updatedValuesArray[valueKey];
          if (i > 1) {
            params.UpdateExpression += ', #param' + i + ' = :val' + i;
          }
        });
        ddb.updateItem(params, function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data.Attributes);
          }
        });
      })();
    }
  });
};

/**
 * Deletes an item from the database
 * @memberof dynamo
 * @param {Object} query Query to locate entries to delete
 * @returns {Object} promise
 */
dynamo['delete'] = function (hashObject) {
  return new Promise(function (resolve, reject) {
    var key = Object.keys(hashObject)[0];
    var table = dynamo.schemas['1'].tableName;
    if (!table) {
      reject('No table defined');
    }
    var params = {
      TableName: table,
      Key: {}
    };
    params.Key[key] = hashObject[key];
    ddb.deleteItem(params, function (err, data) {
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
dynamo.extend = function (name, fn) {
  dynamo[name] = fn.bind(dynamo);
};