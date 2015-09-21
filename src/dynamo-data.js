export const tables = {};

tables.table = {
  'Table': {
    'AttributeDefinitions': [
       // tables.attribute
    ],
    'TableName': '',
    'KeySchema': [
      // tables.keyData
    ],
    'ProvisionedThroughput': {
      'ReadCapacityUnits': 1,
      'WriteCapacityUnits': 1
    },
    'GlobalSecondaryIndexes': []
  }
};

tables.filterExpression = {
  'FilterExpression': '', // contains( #roles, :val1)',
  'ExpressionAttributeNames': {
      // '#roles': 'roles'
  },
  'ExpressionAttributeValues': {
      // ':val1': 'eng_user'
  }
};

tables.attribute = {
  'AttributeName': 'authId',
  'AttributeType': 'S'
};

tables.keyData = {
  'AttributeName': null,
  'KeyType': 'HASH'
};

tables.secondaryIndex = {
  'IndexName': '',
  'KeySchema': [],
  'Projection': {
    'ProjectionType': 'ALL'
  },
  'ProvisionedThroughput': {
    'ReadCapacityUnits': 1,
    'WriteCapacityUnits': 1
  }
};
