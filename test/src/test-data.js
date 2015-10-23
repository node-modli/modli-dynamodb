import { Joi } from 'modli';

export const dbData = {};

// Mockup to represent numeric keys and multiple gsi
dbData.numericAccount = {
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
dbData.testAccount1 = {
  TableName: 'tmpusers',
  Item: {
    'id': 'ben1',
    'age': 25,
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

dbData.testAccount2 = {
  TableName: 'tmpusers',
  Item: {
    'id': 'ben2',
    'age': 20,
    'authId': 'benauth',
    'lastName': 'McCallister',
    'email': 'ben@ben.com',
    'roles': [
      'eng_user'
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
    'firstName': 'Benji'
  },
  ReturnValues: 'ALL_OLD', // optional (NONE | ALL_OLD)
  ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
  ReturnItemCollectionMetrics: 'NONE' // optional (NONE | SIZE)
};

dbData.testModel = {
  name: 'tmpuser',
  version: 1,
  autoCreate: true,
  indexes: [
    { keytype: 'hash', value: 'id', type: 'S'},
    { keytype: 'secondary', value: 'authId', type: 'S'}
  ],
  tableName: 'tmpusers',
  schema: {
    permissions: {}
  }
};

dbData.userSchema = {
  id: Joi.string(),
  password: Joi.string(),
  firstName: Joi.string(),
  lastName: Joi.string()
};

dbData.testNumericModel = {
  name: 'numuser',
  version: 1,
  autoCreate: false,
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

dbData.testProjectionModel = {
  name: 'useraccount',
  version: 1,
  autoCreate: false,
  indexes: [
    { keytype: 'hash', value: 'id', type: 'N'},
    { keytype: 'secondary', value: 'login', type: 'S', projectionType: 'KEYS_ONLY'}
  ],
  tableName: 'useraccounts',
  schema: {
    permissions: {}
  }
};


dbData.testIncludeModel = {
  name: 'userinclude',
  version: 1,
  autoCreate: false,
  indexes: [
    { keytype: 'hash', value: 'id', type: 'N'},
    { keytype: 'secondary', value: 'login', type: 'S', projectionType: 'INCLUDE', nonKeyAttributes: ['age']}
  ],
  tableName: 'userincludes',
  schema: {
    permissions: {}
  }
};

dbData.badModel = {
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

dbData.nogsiModel = {
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
