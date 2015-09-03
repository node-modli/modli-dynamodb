// Mockup to represent numeric keys and multiple gsi
export const numericAccount = {
  TableName: 'numusers',
  Item: {
    'id': 1,              // Hash
    'login': 'ben',        // First GSI
    'age': 999,           // Second GSI
    'firstName': 'Ben',
    'lastName': 'McCallister',
    'email': 'ben@ben.com'
  },
  ReturnValues: 'ALL_OLD', // optional (NONE | ALL_OLD)
  ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
  ReturnItemCollectionMetrics: 'NONE' // optional (NONE | SIZE)
};


// Standard mockup to match usrusers
export const testAccount1 = {
  TableName: 'tmpusers',
  Item: {
    'id': 'ben1',
    'authId': 'benauth',
    'lastName': 'McCallister',
    'email': 'ben@ben.com',
    'roles': [
      'qa_user'
    ],
    'permissions': {
      'leadhub': {
        'methods': {
          'leads': {
            'DELETE': {
              'conditionals': []
            }
          }
        }
      }
    },
    'firstName': 'Ben'
  },
  ReturnValues: 'ALL_OLD', // optional (NONE | ALL_OLD)
  ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
  ReturnItemCollectionMetrics: 'NONE' // optional (NONE | SIZE)
};

export const testAccount2 = {
  TableName: 'tmpusers',
  Item: {
    'id': 'ben2',
    'authId': 'benauth',
    'lastName': 'McCallister',
    'email': 'ben@ben.com',
    'roles': [
      'qa_user'
    ],
    'permissions': {
      'leadhub': {
        'methods': {
          'leads': {
            'DELETE': {
              'conditionals': []
            }
          }
        }
      }
    },
    'firstName': 'Ben'
  },
  ReturnValues: 'ALL_OLD', // optional (NONE | ALL_OLD)
  ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
  ReturnItemCollectionMetrics: 'NONE' // optional (NONE | SIZE)
};

export const testModel = {
  name: 'tmpuser',
  version: 1,
  indexes: [
    { keytype: 'hash', value: 'id', type: 'S'},
    { keytype: 'secondary', value: 'authId', type: 'S'}
  ],
  tableName: 'tmpusers',
  schema: {
    permissions: {}
  }
};

export const testNumericModel = {
  name: 'numuser',
  version: 1,
  indexes: [
    { keytype: 'hash', value: 'id', type: 'N'},
    { keytype: 'secondary', value: 'login', type: 'S'},
    { keytype: 'secondary', value: 'age', type: 'N'}
  ],
  tableName: 'numusers',
  schema: {
    permissions: {}
  }
};

export const badModel = {
  name: 'tmpuser',
  version: 1,
  indexes: [
    { keytype: 'junk', value: 'id', type: 'S'},
    { keytype: 'secondary', value: 'authId', type: 'S'}
  ],
  tableName: null,
  schema: {
    permissions: {}
  }
};

export const nogsiModel = {
  name: 'nogscis',
  version: 1,
  indexes: [
    { keytype: 'junk', value: 'id', type: 'S'}
  ],
  tableName: 'trash',
  schema: {
    permissions: {}
  }
};
