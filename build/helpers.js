'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _dynamoData = require('./dynamo-data');

var _ = require('lodash');
var helpers = {};

exports.helpers = helpers;
var expressions = ['between', 'in'];

var comparators = ['=', '<>', '<=', '>', '>='];

var functions = ['attribute_type', 'begins_with', 'contains'];

helpers.isExpression = function (str) {
  return _.includes(expressions, str);
};

helpers.isComparator = function (str) {
  return _.includes(comparators, str);
};

helpers.isFunction = function (str) {
  return _.includes(functions, str);
};

helpers.handleExpressionOperator = function (arr, str, newIndex) {
  var newFilter = Object.create({});
  newFilter = _.clone(_dynamoData.tables.filterExpression, true);
  if (arr[1] === 'in') {
    (function () {
      var inArr = arr[2].split(',');
      newFilter.FilterExpression = '#attr1 ' + arr[1] + '( ';
      var iter = 1;
      _.each(inArr, function (row) {
        if (iter > 1) {
          newFilter.FilterExpression += ', ';
        }
        newFilter.FilterExpression += ':val' + newIndex + '_' + iter;
        newFilter.ExpressionAttributeValues[':val' + newIndex + '_' + iter] = row;

        iter++;
      });
      newFilter.ExpressionAttributeNames['#attr' + newIndex] = arr[0];
      newFilter.FilterExpression += ')';
    })();
  }
  if (arr[1] === 'between') {
    newFilter.FilterExpression = '#attr1 ' + arr[1] + ' :val' + newIndex + ' and :val' + newIndex + '_1';
    newFilter.ExpressionAttributeNames['#attr' + newIndex] = arr[0];
    newFilter.ExpressionAttributeValues[':val' + newIndex] = parseFloat(arr[2]);
    newFilter.ExpressionAttributeValues[':val' + newIndex + '_1'] = parseFloat(arr[3]);
  }
  return newFilter;
};

helpers.createExpression = function (currentFilter, newfilterString, index) {
  var newIndex = index || 1;
  var newFilter = Object.create({});
  newFilter = _.clone(_dynamoData.tables.filterExpression, true);
  var filterArr = newfilterString.split(' ');
  if (helpers.isFunction(filterArr[1])) {
    newFilter.FilterExpression = filterArr[1] + '(#attr1, :val1)';
    newFilter.ExpressionAttributeNames['#attr' + newIndex] = filterArr[0];
    newFilter.ExpressionAttributeValues[':val' + newIndex] = filterArr[2];
  } else if (helpers.isComparator(filterArr[1])) {
    newFilter.FilterExpression = '#attr1 ' + filterArr[1] + ' :val1';
    newFilter.ExpressionAttributeNames['#attr' + newIndex] = filterArr[0];
    newFilter.ExpressionAttributeValues[':val' + newIndex] = filterArr[2];
  } else if (helpers.isExpression(filterArr[1])) {
    newFilter = helpers.handleExpressionOperator(filterArr, newfilterString, newIndex);
  } else {
    newFilter = { error: 'No specified operator applied for filter' };
  }
  return newFilter;
};