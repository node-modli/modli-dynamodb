const _ = require('lodash');
import { tables } from './dynamo-data';
export const helpers = {};

const expressions = [
  'between',
  'in'
];

const comparators = [
  '=',
  '<>',
  '<=',
  '>',
  '>='
];

const functions = [
  'attribute_type',
  'begins_with',
  'contains'
];

helpers.isExpression = (str) => {
  return (_.includes(expressions, str));
};

helpers.isComparator = (str) => {
  return (_.includes(comparators, str));
};

helpers.isFunction = (str) => {
  return (_.includes(functions, str));
};

helpers.handleExpressionOperator = (arr, str, newIndex) => {
  let newFilter = Object.create({});
  newFilter = _.clone(tables.filterExpression, true);
  if (arr[1] === 'in') {
    let inArr = arr[2].split(',');
    newFilter.FilterExpression = '#attr1 ' + arr[1] + '( ';
    let iter = 1;
    _.each(inArr, function(row) {
      if (iter > 1) {
        newFilter.FilterExpression += ', ';
      }
      newFilter.FilterExpression += ':val' + newIndex + '_' + iter;
      newFilter.ExpressionAttributeValues[':val' + newIndex + '_' + iter] = row;

      iter++;
    });
    newFilter.ExpressionAttributeNames['#attr' + newIndex] = arr[0];
    newFilter.FilterExpression += ')';
  }
  if (arr[1] === 'between') {
    newFilter.FilterExpression = '#attr1 ' + arr[1] + ' :val' + newIndex + ' and :val' + newIndex + '_1';
    newFilter.ExpressionAttributeNames['#attr' + newIndex] = arr[0];
    newFilter.ExpressionAttributeValues[':val' + newIndex] = parseFloat(arr[2]);
    newFilter.ExpressionAttributeValues[':val' + newIndex + '_1'] = parseFloat(arr[3]);
  }
  return newFilter;
};

helpers.createExpression = (currentFilter, newfilterString, index) => {
  const newIndex = index || 1;
  let newFilter = Object.create({});
  newFilter = _.clone(tables.filterExpression, true);
  const filterArr = newfilterString.split(' ');
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
