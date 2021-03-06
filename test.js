var _ = require('underscore');
var chai = require('chai');
var GoodTables = require('./');
var Promise = require('bluebird');
var should = require('chai').should();
var spies = require('chai-spies');
var queryString = require('query-string');
var fetchMock = require('fetch-mock/src/server');

var VALID_RESPONSE = {
  'report': {
    'meta': {
        'bad_column_count': 0,
        'bad_row_count': 0,

        'columns': [
          {
            'bad_type_percent': 0,
            'index': 0,
            'name': '123'
          }
        ],

        'header_index': 0,
        'headers': ['123'],
        'name': 'Pipeline',
        'row_count': 1,
        'encoding': 'iso-8859-1'
    },

    'results': []
  },

  'success': true
};

var INVALID_GROUPED_RESPONSE = {
  'report': {
    'meta': {
        'bad_column_count': 0,
        'bad_row_count': 0,

        'columns': [
          {
            'bad_type_percent': 0,
            'index': 0,
            'name': '123'
          }
        ],

        'header_index': 0,
        'headers': ['123'],
        'name': 'Pipeline',
        'row_count': 1
    },

    'results': [
      {
        '2': {
          'result_context': [
            '',
            '',
            ''
          ],

          'results': [
            {
              'column_index': null,
              'column_name': '',
              'processor': 'structure',
              'result_category': 'row',
              'result_id': 'structure_005',
              'result_level': 'error',
              'result_message': 'Row 2 is empty.',
              'result_name': 'Empty Row',
              'row_name': ''
            },

            {
              'column_index': 0,
              'column_name': 'id',
              'processor': 'schema',
              'result_category': 'row',
              'result_id': 'schema_003',
              'result_level': 'warning',
              'result_message': 'The value is not a valid Integer.',
              'result_name': 'Incorrect Type',
              'row_name': ''
            },

            {
              'column_index': 0,
              'column_name': 'id',
              'processor': 'schema',
              'result_category': 'row',
              'result_id': 'schema_004',
              'result_level': 'error',
              'result_message': 'Column id is a required field, but no value can be found in row 2.',
              'result_name': 'Required Field',
              'row_name': ''
            },
          ],

          'row_index': 2
        }
      },

      {
        '3': {
          'result_context': [
            '1',
            '2',
            '3',
            '4',
            '5',
            '6'
          ],

          'results': [
            {
              'column_index': null,
              'column_name': '',
              'processor': 'structure',
              'result_category': 'row',
              'result_id': 'structure_003',
              'result_level': 'error',
              'result_message': 'Row 3 is defective: the dimensions are incorrect compared to headers.',
              'result_name': 'Defective Row',
              'row_name': ''
            },

            {
              'column_index': null,
              'column_name': '',
              'processor': 'schema',
              'result_category': 'row',
              'result_id': 'schema_002',
              'result_level': 'warning',
              'result_message': 'The row dimensions do not match the header dimensions.',
              'result_name': 'Incorrect Dimensions',
              'row_name': '1'
            }
          ],

          'row_index': 3
        }
      }]
  },

  'success': true
};

var INVALID_RESPONSE = {
  'report': {
    'meta': {
        'bad_column_count': 1,
        'bad_row_count': 0,

        'columns': [
          {
            'bad_type_percent': 0,
            'index': 0,
            'name': '123'
          }
        ],

        'header_index': 0,
        'headers': ['123'],
        'name': 'Pipeline',
        'row_count': 1
    },

    'results': [
      {
        'column_index': null,
        'column_name': '',
        'processor': 'structure',
        'result_category': 'row',

        'result_context': [
            '',
            '',
            ''
        ],

        'result_id': 'structure_005',
        'result_level': 'error',
        'result_message': 'Row 2 is empty.',
        'result_name': 'Empty Row',
        'row_index': '',
        'row_name': ''
      },

      {
        'column_index': null,
        'column_name': '',
        'processor': 'structure',
        'result_category': 'row',

        'result_context': [
            '1',
            '2',
            '3',
            '4',
            '5',
            '6'
        ],

        'result_id': 'structure_003',
        'result_level': 'error',
        'result_message': 'Row 3 is defective: the dimensions are incorrect compared to headers.',
        'result_name': 'Defective Row',
        'row_index': 3,
        'row_name': ''
      },

      {
        'column_index': 0,
        'column_name': 'id',
        'processor': 'schema',
        'result_category': 'row',

        'result_context': [
            '',
            '',
            ''
        ],

        'result_id': 'schema_003',
        'result_level': 'warning',
        'result_message': 'The value is not a valid Integer.',
        'result_name': 'Incorrect Type',
        'row_index': 2,
        'row_name': ''
      }
    ]
  },

  'success': true
};


chai.use(spies);

describe('GoodTables API wrapper', function() {
  it('throw error if data file is not passed in params', function(done, err) {
    if(err) done(err);

    try {
      (new GoodTables()).run();
    } catch(exception) {
      exception.message.should.be.not.empty;
      exception.message.should.be.a('string');
      done();
      return;
    }

    done('Exception not thrown');
  });

  it('respect passed param for request method', function(done, err) {
    var goodtables;

    if(err) done(err);

    fetchMock.restore();
    fetchMock.mock('^http://goodtables.okfnlabs.org/api', JSON.stringify(VALID_RESPONSE));

    goodtables = new GoodTables({method: 'get'});

    goodtables.run('data').then(function() {
      goodtables = new GoodTables({method: 'post'});

      goodtables.run('data').then(function(a) {
        done();
      });
    });
  });

  it('respect report_type param', function(done, err) {
    if(err) done(err);

    fetchMock.restore();
    fetchMock.mock('^http://goodtables.okfnlabs.org/api', JSON.stringify(INVALID_GROUPED_RESPONSE));

    (new GoodTables({report_type: 'grouped'})).run('data').then(function(VR) {
      VR.isValid().should.be.false;
      VR.getValidationErrors().length.should.equal(3);
      done();
    });
  });

  it('return Promise object', function(done, err) {
    if(err) done(err);

    fetchMock.restore();
    fetchMock.mock('^http://goodtables.okfnlabs.org/api', JSON.stringify(VALID_RESPONSE));

    (new GoodTables()).run('data').should.be.an.instanceOf(Promise);
    done();
  });

  it('reject with a message when connection failed', function(done, err) {
    if(err) done(err);


    fetchMock.restore();
    fetchMock.mock('^http://goodtables.okfnlabs.org/api', 500);

    (new GoodTables()).run('data').catch(function(E) { E.should.be.a('string'); done(); });
  });

  it('validate correct data', function(done, err) {
    if(err) done(err);

    fetchMock.restore();
    fetchMock.mock('^http://goodtables.okfnlabs.org/api', JSON.stringify(VALID_RESPONSE));

    (new GoodTables()).run('data').then(function(VR) { 
      VR.isValid().should.be.true; 
      VR.getEncoding().should.equal('iso-8859-1');
      done(); 
    });
  });

  it('invalidate incorrect data', function(done, err) {
    if(err) done(err);

    fetchMock.restore();
    fetchMock.mock('^http://goodtables.okfnlabs.org/api', JSON.stringify(INVALID_RESPONSE));

    (new GoodTables()).run('data').then(function(VR) { VR.isValid().should.be.false; done(); });
  });

  it('provide default values for all params', function(done, err) {
    if(err) done(err);

    fetchMock.restore();
    fetchMock.mock({routes: [
          {
            name: 'mock1',
            matcher: '^http://goodtables.okfnlabs.org/api',
            response: JSON.stringify(VALID_RESPONSE)
          }
        ]}
    );

    (new GoodTables()).run('data').then(function(VR) {
      var params = fetchMock.calls('mock1');
          _.isEqual(queryString.parse(params[0][0].split('?')[1]), {
            data             : 'data',
            fail_fast        : 'true',
            format           : 'csv',
            ignore_empty_rows: 'false',
            report_limit     : '1000',
            report_type      : 'basic',
            row_limit        : '20000'
          }).should.be.true;

          done();
    });
  });
});
