'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _dynamoData = require('./dynamo-data');

var _helpers = require('./helpers');

var Promise = require('bluebird');
var _ = require('lodash');

var AWS = require('aws-sdk');
var DOC = require('dynamodb-doc');

/**
 * Class constructor
 * @class dynamodb
 */

var _default = (function () {
  function _default(config) {
    _classCallCheck(this, _default);

    this.schemas = {};
    var dynDb = new AWS.DynamoDB(config);
    this.ddb = new DOC.DynamoDB(dynDb);
  }

  /**
   * Sets the schema for the model
   * @memberof dynamodb
   * @param {String} version The version of the model
   * @param {Object} schema Json Object with schema information
   */

  _createClass(_default, [{
    key: 'setSchema',
    value: function setSchema(schema, version) {
      this.defaultVersion = version;
      this.schemas[version] = schema;
    }

    /**
     * Returns the active schema
     * @memberof dynamodb
     * @returns {Object} Current JSON Schema Object
     */
  }, {
    key: 'getSchema',
    value: function getSchema() {
      return this.schemas;
    }

    /**
     * Generates a secondary index for a new table
     * @memberof dynamodb
     * @param {Object} Parameters to deterministically generate a secondary index
     * @returns {Object} New Index
     */
  }, {
    key: 'generateSecondaryIndex',
    value: function generateSecondaryIndex(params) {
      var newIndex = _.clone(_dynamoData.tables.secondaryIndex, true);
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
  }, {
    key: 'generateDefinition',
    value: function generateDefinition(params) {
      var newDefinition = _.clone(_dynamoData.tables.attribute, true);
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
     * @memberof dynamodb
     * @param {Object} body Contents to create entry
     * @returns {Object} promise
     */
  }, {
    key: 'create',
    value: function create(body) {
      var _this = this;

      var paramVersion = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return new Promise(function (resolve, reject) {
        _helpers.helpers.checkCreateTable(_this, paramVersion).then(function () {
          var version = paramVersion === false ? _this.defaultVersion : paramVersion;
          var validationErrors = _this.validate(body, version);
          if (validationErrors) {
            throw new Error('Modli Errors: ' + validationErrors);
          } else {
            var createParams = {
              TableName: _this.schemas[version].tableName,
              ReturnValues: 'NONE',
              Item: body
            };
            _this.ddb.putItem(createParams, function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(body);
              }
            });
          }
        })['catch'](reject);
      });
    }

    /**
     * Calls create table using explicit table creation parameters
     * @memberof dynamodb
     * @param {Object} body Contents to create table
     * @returns {Object} promise
     */
  }, {
    key: 'createTable',
    value: function createTable(params) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.ddb.listTables({}, function (err, foundTables) {
          var tableList = undefined;
          tableList = foundTables || { TableNames: [] };
          if (_.contains(tableList.TableNames, params.TableName)) {
            resolve({ TableName: params.TableName, existed: true });
          } else {
            _this2.ddb.createTable(params, function (createErr, res) {
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
  }, {
    key: 'createTableFromModel',
    value: function createTableFromModel() {
      var _this3 = this;

      var paramVersion = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

      var version = paramVersion === false ? this.defaultVersion : paramVersion;
      var newTable = _.clone(_dynamoData.tables.table, true);
      newTable.Table.TableName = this.schemas[version].tableName;
      _.each(this.schemas[version].indexes, function (row) {
        newTable.Table.AttributeDefinitions.push(_this3.generateDefinition(row));
        if (row.keytype === 'hash' || row.keytype === 'range') {
          newTable.Table.KeySchema.push(_this3.generateKey(row));
        } else if (row.keytype === 'secondary') {
          newTable.Table.GlobalSecondaryIndexes.push(_this3.generateSecondaryIndex(row));
        } else {
          return new Error({ error: 'Model has invalid index' });
        }
      });
      if (newTable.Table.GlobalSecondaryIndexes.length < 1) {
        delete newTable.Table.GlobalSecondaryIndexes;
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
     * Creates a compatible filter to apply to scanned returns
     * @memberof dynamodb
     * @returns {Object} scan ready filter object
     */
  }, {
    key: 'createFilter',
    value: function createFilter(table, filterObject) {
      var newFilter = { 'TableName': table };
      var returnFilter = _.extend(newFilter, _helpers.helpers.createExpression(newFilter, filterObject));
      return returnFilter;
    }

    /**
     * Performs a full unfiltered scan
     * @memberof dynamodb
     * @returns {Object} promise
     */
  }, {
    key: 'scan',
    value: function scan(filterObject) {
      var _this5 = this;

      var paramVersion = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return new Promise(function (resolve, reject) {
        _helpers.helpers.checkCreateTable(_this5, paramVersion).then(function () {
          var version = paramVersion === false ? _this5.defaultVersion : paramVersion;
          var table = _this5.schemas[version].tableName;
          var scanObject = { 'TableName': table };
          if (filterObject) {
            scanObject = _this5.createFilter(table, filterObject);
          }
          _this5.ddb.scan(scanObject, function (err, res) {
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
  }, {
    key: 'list',
    value: function list() {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        _this6.ddb.listTables({}, function (err, res) {
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
  }, {
    key: 'read',
    value: function read(obj) {
      var _this7 = this;

      var paramVersion = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return new Promise(function (resolve, reject) {
        _helpers.helpers.checkCreateTable(_this7, paramVersion).then(function () {
          var version = paramVersion === false ? _this7.defaultVersion : paramVersion;
          var key = Object.keys(obj)[0];
          var itemPromise = null;
          var type = null;

          _.each(_this7.schemas[version].indexes, function (row) {
            if (row.value === key) {
              type = row.keytype;
              return false;
            }
          });

          if (!type) {
            reject(new Error('No type'));
          } else {
            if (type === 'hash') {
              itemPromise = _this7.getItemByHash(obj, version);
            } else {
              itemPromise = _this7.getItemById(obj, version);
            }
          }
          resolve(itemPromise);
        })['catch'](reject);
      });
    }

    /**
     * Reads from the database by secondary index
     * @memberof dynamodb
     * @param {Object} obj The object to search by secondary index on
     *   @property {string} hash/index - Example { authId: '1234'}
     * @returns {Object} promise
     */
  }, {
    key: 'getItemById',
    value: function getItemById(obj) {
      var _this8 = this;

      var paramVersion = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return new Promise(function (resolve, reject) {
        _helpers.helpers.checkCreateTable(_this8, paramVersion).then(function () {
          var version = paramVersion === false ? _this8.defaultVersion : paramVersion;
          var table = _this8.schemas[version].tableName;
          var key = Object.keys(obj)[0];
          var params = {
            TableName: table,
            IndexName: key + '-index',
            KeyConditionExpression: key + ' = :hk_val',
            ExpressionAttributeValues: {
              ':hk_val': obj[key]
            }
          };
          _this8.ddb.query(params, function (err, data) {
            if (err) {
              reject(err);
            } else {
              (function () {
                var returnValue = [];
                var sanitize = _this8.sanitize;
                _.each(data.Items, function (row) {
                  returnValue.push(sanitize(row));
                });
                resolve(returnValue);
              })();
            }
          });
        })['catch'](reject);
      });
    }

    /**
      * Returns a list of objects in an array
      * @memberof dynamodb
      * @param {String} hash Name of the hash to search on
      * @param {Array} array Array of values to search in
      * @returns {Object} promise
      */
  }, {
    key: 'getItemsInArray',
    value: function getItemsInArray(hash, array) {
      var _this9 = this;

      var paramVersion = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

      return new Promise(function (resolve, reject) {
        _helpers.helpers.checkCreateTable(_this9, paramVersion).then(function () {
          var version = paramVersion === false ? _this9.defaultVersion : paramVersion;
          if (!array) {
            reject(new Error('Array empty'));
          }
          if (array.length < 1) {
            reject(new Error('Array contained no values'));
          }
          var table = _this9.schemas[version].tableName;
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

          _this9.ddb.batchGetItem(params, function (err, data) {
            if (err) {
              reject(new Error(err));
            } else {
              (function () {
                var returnArray = [];
                var sanitize = _this9.sanitize;
                _.each(data, function (row) {
                  returnArray.push(sanitize(row));
                });
                resolve(returnArray);
              })();
            }
          });
        })['catch'](reject);
      });
    }

    /**
     * Reads from the database by hash value
     * @memberof dynamodb
     * @param {Object} obj The hash object to search by
     *   @property {string} hash/index - Example { authId: '1234'}
     * @returns {Object} promise
     */
  }, {
    key: 'getItemByHash',
    value: function getItemByHash(obj) {
      var _this10 = this;

      var paramVersion = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return new Promise(function (resolve, reject) {
        _helpers.helpers.checkCreateTable(_this10, paramVersion).then(function () {
          var version = paramVersion === false ? _this10.defaultVersion : paramVersion;
          var table = _this10.schemas[version].tableName;
          var keys = Object.keys(obj);
          var params = {
            TableName: table,
            Key: {}
          };
          // Allows for HASH and possible RANGE key
          keys.forEach(function (key) {
            params.Key[key] = obj[key];
          });
          _this10.ddb.getItem(params, function (err, data) {
            if (err) {
              reject(new Error(err));
            } else {
              resolve(_this10.sanitize(data.Item));
            }
          });
        })['catch'](reject);
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
  }, {
    key: 'update',
    value: function update(hashObject, updatedValuesArray) {
      var _this11 = this;

      var paramVersion = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

      // TODO : Implement validation
      return new Promise(function (resolve, reject) {
        _helpers.helpers.checkCreateTable(_this11, paramVersion).then(function () {
          var keys = Object.keys(hashObject);
          // Allows for HASH and possible RANGE key
          keys.forEach(function (key) {
            if (updatedValuesArray[key]) {
              delete updatedValuesArray[key];
            }
          });
          var version = paramVersion === false ? _this11.defaultVersion : paramVersion;
          var validationErrors = _this11.validate(updatedValuesArray, Object.keys(_this11.schemas)[0]);
          if (validationErrors) {
            reject(new Error(validationErrors));
          } else {
            (function () {
              var table = _this11.schemas[version].tableName;

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
              // Allows for HASH and possible RANGE key
              keys.forEach(function (key) {
                params.Key[key] = hashObject[key];
              });

              var i = 0;
              Object.keys(updatedValuesArray).forEach(function (valueKey) {
                i++;
                params.ExpressionAttributeNames['#param' + i] = valueKey;
                params.ExpressionAttributeValues[':val' + i] = updatedValuesArray[valueKey];
                if (i > 1) {
                  params.UpdateExpression += ', #param' + i + ' = :val' + i;
                }
              });
              _this11.ddb.updateItem(params, function (err, data) {
                if (err) {
                  reject(new Error(err));
                } else {
                  resolve(data.Attributes);
                }
              });
            })();
          }
        })['catch'](reject);
      });
    }

    /**
     * Deletes an item from the database
     * @memberof dynamodb
     * @param {Object} hashObject The object to find by hash, to delete
     *   @property {string} hash/index - Example { authId: '1234'}
     * @returns {Object} promise
     */
  }, {
    key: 'delete',
    value: function _delete(hashObject) {
      var _this12 = this;

      var paramVersion = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return new Promise(function (resolve, reject) {
        _helpers.helpers.checkCreateTable(_this12, paramVersion).then(function () {
          var version = paramVersion === false ? _this12.defaultVersion : paramVersion;
          var keys = Object.keys(hashObject);
          var table = _this12.schemas[version].tableName;

          var params = {
            TableName: table,
            Key: {}
          };
          // Allows for HASH and possible RANGE key
          keys.forEach(function (key) {
            params.Key[key] = hashObject[key];
          });

          _this12.ddb.deleteItem(params, function (err, data) {
            if (err) {
              reject(new Error(err));
            } else {
              resolve(data);
            }
          });
        })['catch'](reject);
      });
    }

    /**
    * Extends the dynamo object
    * @memberof dynamodb
    * @param {String} name The name of the method
    * @param {Function} fn The function to extend on the object
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