const _ = require('lodash');
const Promise = require('bluebird');
import { tables } from './dynamo-data';
export const helpers = {};

const expressions = [
  'between',
  'in'
];

const comparators = [
  {'eq': '='},
  {'gt': '>'},
  {'lt': '<'},
  {'lte': '<='},
  {'gte': '>='}
];

const functions = [
  'attribute_type',
  'begins_with',
  'contains'
];

helpers.checkCreateTable = (modelObj, paramVersion = false) => {
  return new Promise((resolve, reject) => {
    const version = (paramVersion === false) ? modelObj.defaultVersion : paramVersion;

    // Skip if the auto create flag isn't set
    if (!modelObj.schemas[version].autoCreate) {
      resolve();
    }

    // Get current list of tables to determine if table exists
    modelObj.ddb.listTables({}, (err, foundTables) => {
      /* istanbul ignore if */
      if (err) {
        reject(err);
      }
      if (_.contains(foundTables.TableNames, modelObj.schemas[version].tableName)) {
        resolve();
      } else {
        modelObj.createTableFromModel(paramVersion).then(resolve).catch(reject);
      }
    });
  });
};

helpers.isExpression = (str) => {
  return (_.includes(expressions, str));
};

helpers.isComparator = (str) => {
  for (let i = 0; i < comparators.length; i++) {
    const key = Object.keys(comparators[i])[0];
    if (Object.keys(comparators[i])[0] === str) {
      return comparators[i][key];
    }
  }
  return false;
};

helpers.isFunction = (str) => {
  return (_.includes(functions, str));
};

helpers.handleExpressionOperator = (filterObj, operator, key, keyValue, newIndex) => {
  const filterRow = filterObj[Object.keys(filterObj)[newIndex - 1]];
  let newFilter = Object.create({});
  newFilter = _.clone(tables.filterExpression, true);
  const inArr = filterRow[operator];
  if (operator === 'in') {
    newFilter.FilterExpression = '#attr1 ' + operator + '( ';
    let iter = 1;
    _.each(inArr, function(row) {
      if (iter > 1) {
        newFilter.FilterExpression += ', ';
      }
      newFilter.FilterExpression += ':val' + newIndex + '_' + iter;
      newFilter.ExpressionAttributeValues[':val' + newIndex + '_' + iter] = row;
      iter++;
    });
    newFilter.ExpressionAttributeNames['#attr' + newIndex] = key;
    newFilter.FilterExpression += ')';
  }
  if (operator === 'between') {
    newFilter.FilterExpression = '#attr' + newIndex + ' ' + operator + ' :val' + newIndex + ' and :val' + newIndex + '_1';
    newFilter.ExpressionAttributeNames['#attr' + newIndex] = key;
    newFilter.ExpressionAttributeValues[':val' + newIndex] = inArr[0];
    newFilter.ExpressionAttributeValues[':val' + newIndex + '_1'] = inArr[1];
  }
  return newFilter;
};

helpers.createExpression = (currentFilter, filterObj) => {
  let newIndex = 1;
  let newFilter = Object.create({});
  newFilter = _.clone(tables.filterExpression, true);
  newFilter.FilterExpression = '';
  _.each(Object.keys(filterObj), function(key) {
    const operator = Object.keys(filterObj[key])[0];
    const comparator = helpers.isComparator(operator);
    const keyValue = filterObj[key][operator];

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
      const newAddedFilter = helpers.handleExpressionOperator(filterObj, operator, key, keyValue, newIndex);
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
