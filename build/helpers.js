'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _dynamoData = require('./dynamo-data');

var _ = require('lodash');
var Promise = require('bluebird');
var helpers = {};

exports.helpers = helpers;
var expressions = ['between', 'in'];

var comparators = [{ 'eq': '=' }, { 'gt': '>' }, { 'lt': '<' }, { 'lte': '<=' }, { 'gte': '>=' }];

var functions = ['attribute_type', 'begins_with', 'contains'];

helpers.checkCreateTable = function (modelObj) {
  var paramVersion = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

  return new Promise(function (resolve, reject) {
    var version = paramVersion === false ? modelObj.defaultVersion : paramVersion;

    // Skip if the auto create flag isn't set
    if (!modelObj.schemas[version].autoCreate) {
      resolve();
    }

    // Get current list of tables to determine if table exists
    modelObj.ddb.listTables({}, function (err, foundTables) {
      /* istanbul ignore if */
      if (err) {
        reject(err);
      }
      if (_.contains(foundTables.TableNames, modelObj.schemas[version].tableName)) {
        resolve();
      } else {
        modelObj.createTableFromModel(paramVersion).then(resolve)['catch'](reject);
      }
    });
  });
};

helpers.isExpression = function (str) {
  return _.includes(expressions, str);
};

helpers.isComparator = function (str) {
  for (var i = 0; i < comparators.length; i++) {
    var key = Object.keys(comparators[i])[0];
    if (Object.keys(comparators[i])[0] === str) {
      return comparators[i][key];
    }
  }
  return false;
};

helpers.isFunction = function (str) {
  return _.includes(functions, str);
};

helpers.handleExpressionOperator = function (filterObj, operator, key, keyValue, newIndex) {
  var filterRow = filterObj[Object.keys(filterObj)[newIndex - 1]];
  var newFilter = Object.create({});
  newFilter = _.clone(_dynamoData.tables.filterExpression, true);
  var inArr = filterRow[operator];
  if (operator === 'in') {
    (function () {
      newFilter.FilterExpression = '#attr1 ' + operator + '( ';
      var iter = 1;
      _.each(inArr, function (row) {
        if (iter > 1) {
          newFilter.FilterExpression += ', ';
        }
        newFilter.FilterExpression += ':val' + newIndex + '_' + iter;
        newFilter.ExpressionAttributeValues[':val' + newIndex + '_' + iter] = row;
        iter++;
      });
      newFilter.ExpressionAttributeNames['#attr' + newIndex] = key;
      newFilter.FilterExpression += ')';
    })();
  }
  if (operator === 'between') {
    newFilter.FilterExpression = '#attr' + newIndex + ' ' + operator + ' :val' + newIndex + ' and :val' + newIndex + '_1';
    newFilter.ExpressionAttributeNames['#attr' + newIndex] = key;
    newFilter.ExpressionAttributeValues[':val' + newIndex] = inArr[0];
    newFilter.ExpressionAttributeValues[':val' + newIndex + '_1'] = inArr[1];
  }
  return newFilter;
};

helpers.createExpression = function (currentFilter, filterObj) {
  var newIndex = 1;
  var newFilter = Object.create({});
  newFilter = _.clone(_dynamoData.tables.filterExpression, true);
  newFilter.FilterExpression = '';
  _.each(Object.keys(filterObj), function (key) {
    var operator = Object.keys(filterObj[key])[0];
    var comparator = helpers.isComparator(operator);
    var keyValue = filterObj[key][operator];

    if (newIndex > 1) {
      newFilter.FilterExpression += ' and ';
    }
    if (helpers.isFunction(operator)) {
      newFilter.FilterExpression += operator + '(#attr' + newIndex + ', :val' + newIndex + ')';
      newFilter.ExpressionAttributeNames['#attr' + newIndex] = key;
      newFilter.ExpressionAttributeValues[':val' + newIndex] = keyValue;
    } else if (comparator) {
      newFilter.FilterExpression += '#attr' + newIndex + ' ' + comparator + ' :val' + newIndex;
      newFilter.ExpressionAttributeNames['#attr' + newIndex] = key;
      newFilter.ExpressionAttributeValues[':val' + newIndex] = keyValue;
    } else if (helpers.isExpression(operator)) {
      var newAddedFilter = helpers.handleExpressionOperator(filterObj, operator, key, keyValue, newIndex);
      newFilter.FilterExpression += newAddedFilter.FilterExpression;
      _.merge(newFilter.ExpressionAttributeValues, newAddedFilter.ExpressionAttributeValues);
      _.merge(newFilter.ExpressionAttributeNames, newAddedFilter.ExpressionAttributeNames);
    } else {
      newFilter = { error: 'No specified operator applied for filter' };
    }
    newIndex++;
  });
  return newFilter;
};