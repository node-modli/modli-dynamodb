'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _dynamoData = require('./dynamo-data');

var Promise = require('bluebird');
var _ = require('lodash');

var AWS = require('aws-sdk');
var DOC = require('dynamodb-doc');

/**
 * @namespace dynamo
 */

var _default = (function () {
  function _default(config) {
    _classCallCheck(this, _default);

    AWS.config.update(config);
    this.schemas = {};
    this.ddb = new DOC.DynamoDB();
  }

  _createClass(_default, [{
    key: 'setSchema',
    value: function setSchema(version, schema) {
      this.schemas[version] = schema;
    }
  }, {
    key: 'getSchema',
    value: function getSchema() {
      return this.schemas;
    }
  }, {
    key: 'generateSecondaryIndex',
    value: function generateSecondaryIndex(params) {
      var newIndex = Object.create({});
      try {
        newIndex = _.clone(_dynamoData.tables.secondaryIndex, true);
        newIndex.IndexName = params.value + '-index';
        newIndex.KeySchema.push(this.generateKey(params));
        return newIndex;
      } catch (err) {
        return err;
      }
      return newIndex;
    }
  }, {
    key: 'generateDefinition',
    value: function generateDefinition(params) {
      var newDefinition = _.clone(_dynamoData.tables.attribute, true);
      newDefinition.AttributeName = params.value;
      newDefinition.AttributeType = params.type;
      return newDefinition;
    }

    // TODO: Test with ranges
  }, {
    key: 'generateKey',
    value: function generateKey(params) {
      var newAtrribute = _.clone(_dynamoData.tables.keyData, true);
      newAtrribute.AttributeName = params.value;
      newAtrribute.KeyType = params.keytype === 'range' ? 'RANGE' : 'HASH';
      return newAtrribute;
    }

    /**
     * Creates a new entry in the database
     * @memberof dynamo
     * @param {Object} body Contents to create entry
     * @returns {Object} promise
     */
    // TODO: Double check validation
  }, {
    key: 'create',
    value: function create(body) {
      var _this = this;

      // Return promise
      return new Promise(function (resolve, reject) {
        try {
          var createParams = {
            TableName: _this.schemas['1'].tableName,
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
            _this.ddb.putItem(createParams, function (err, data) {
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
  }, {
    key: 'createTable',
    value: function createTable(params) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.ddb.createTable(params, function (err, res) {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      });
    }
  }, {
    key: 'createTableFromModel',
    value: function createTableFromModel() {
      var _this3 = this;

      var newTable = _.clone(_dynamoData.tables.table, true);
      newTable.Table.TableName = this.schemas['1'].tableName;
      _.each(this.schemas['1'].indexes, function (row) {
        newTable.Table.AttributeDefinitions.push(_this3.generateDefinition(row));
        if (row.keytype === 'hash') {
          newTable.Table.KeySchema.push(_this3.generateKey(row));
        } else if (row.keytype === 'secondary') {
          newTable.Table.GlobalSecondaryIndexes.push(_this3.generateSecondaryIndex(row));
        } else {
          return { error: 'Model has invalid index' };
        }
      });
      if (newTable.Table.GlobalSecondaryIndexes.length < 1) {
        delete newTable.Table.GlobalSecondaryIndexes;
      }
      return this.createTable(newTable.Table);
    }

    /**
      * Deletes a table explicitly
      */
  }, {
    key: 'deleteTable',
    value: function deleteTable(params) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        _this4.ddb.deleteTable(params, function (err, res) {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      });
    }

    /**
      * Performs a full scan
      */
  }, {
    key: 'scan',
    value: function scan() {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        var table = _this5.schemas['1'].tableName;
        if (!table) {
          reject('No table defined');
        }
        _this5.ddb.scan({ 'TableName': table }, function (err, res) {
          if (err) {
            reject(err);
          } else {
            resolve(res.Items);
          }
        });
      });
    }

    /**
      * Gets a list of the tables
      */
  }, {
    key: 'list',
    value: function list() {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        _this6.ddb.listTables({}, function (err, res) {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      });
    }

    /**
      * Performs a deterministic read
      */
  }, {
    key: 'read',
    value: function read(obj) {
      var key = Object.keys(obj)[0];
      var itemPromise = null;
      var type = null;

      _.each(this.schemas['1'].indexes, function (row) {
        if (row.value === key) {
          type = row.keytype;
          return false;
        }
      });

      if (!type) {
        itemPromise = { error: 'No type' };
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
     * @param {Object} query Specific id or query to construct read
     * @returns {Object} promise
     */
  }, {
    key: 'getItemById',
    value: function getItemById(obj) {
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        var table = _this7.schemas['1'].tableName;
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

        _this7.ddb.query(params, function (err, data) {
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
      */
  }, {
    key: 'getItemsInArray',
    value: function getItemsInArray(hash, array) {
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        if (!array) {
          reject('Array empty');
          return false;
        }
        if (array.length < 1) {
          reject('Array contained no values');
          return false;
        }
        var table = _this8.schemas['1'].tableName;
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

        _this8.ddb.batchGetItem(params, function (err, data) {
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
  }, {
    key: 'getItemByHash',
    value: function getItemByHash(obj) {
      var _this9 = this;

      return new Promise(function (resolve, reject) {
        var table = _this9.schemas['1'].tableName;
        if (!table) {
          reject('No table defined');
        }
        var key = Object.keys(obj)[0];
        var params = {
          TableName: table,
          Key: {}
        };
        params.Key[key] = obj[key];
        _this9.ddb.getItem(params, function (err, data) {
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
  }, {
    key: 'update',
    value: function update(hashObject, updatedValuesArray) {
      var _this10 = this;

      // TODO : Implement validation
      return new Promise(function (resolve, reject) {
        var validationErrors = false;

        if (validationErrors) {
          reject(validationErrors);
        } else {
          (function () {
            var table = _this10.schemas['1'].tableName;
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
            _this10.ddb.updateItem(params, function (err, data) {
              if (err) {
                reject(err);
              } else {
                resolve(data.Attributes);
              }
            });
          })();
        }
      });
    }

    /**
     * Deletes an item from the database
     * @memberof dynamo
     * @param {Object} query Query to locate entries to delete
     * @returns {Object} promise
     */
  }, {
    key: 'delete',
    value: function _delete(hashObject) {
      var _this11 = this;

      return new Promise(function (resolve, reject) {
        var key = Object.keys(hashObject)[0];
        var table = _this11.schemas['1'].tableName;
        if (!table) {
          reject('No table defined');
        }
        var params = {
          TableName: table,
          Key: {}
        };
        params.Key[key] = hashObject[key];
        _this11.ddb.deleteItem(params, function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }

    /*
     * Extends a method by name and call back
     */
  }, {
    key: 'extend',
    value: function extend(name, fn) {
      this[name] = fn.bind(this);
    }
  }]);

  return _default;
})();

exports['default'] = _default;
module.exports = exports['default'];