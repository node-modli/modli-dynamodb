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
