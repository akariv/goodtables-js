var _ = require('underscore');
var chai = require('chai');
var Goodtables = require('./index');
var Promise = require('promise-polyfill');
var request = require('superagent');
var should = require('chai').should();
var spies = require('chai-spies');
var queryString = require('query-string');

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
        'row_count': 1
    },

    'results': []
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

    'results': [{'result_level': 'error'}]
  },

  'success': true
};



chai.use(spies);

describe('Goodtables API wrapper', function() {
  it('throw error if data file is not passed in params', function(done, err) {
    if(err) done(err);

    try {
      (new Goodtables()).run();
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
    var spyGet;
    var spyPost;


    if(err) done(err);

    require('superagent-mock')(request, [{
      callback: function (match, data) { return {text: data}; },
      fixtures: function (match, params) { return JSON.stringify(VALID_RESPONSE); },
      pattern: '.*'
    }]);

    spyGet = chai.spy.on(request, 'get');
    spyPost = chai.spy.on(request, 'post');
    goodtables = new Goodtables({method: 'get'});

    goodtables.run('data').then(function() {
      goodtables = new Goodtables({method: 'post'});

      goodtables.run('data').then(function() {
        spyGet.should.have.been.called();
        spyPost.should.have.been.called();
        done();
      });
    });
  });

  it('provide default values for all params', function(done, err) {
    if(err) done(err);

    require('superagent-mock')(request, [{
      callback: function (match, data) {
        _.isEqual(queryString.parse(match[0].split('?')[1]), {
          data             : 'data',
          fail_fast        : 'true',
          format           : 'csv',
          ignore_empty_rows: 'false',
          report_limit     : '1000',
          row_limit        : '20000'
        }).should.be.true;

        done();

        return {text: data};
      },

      fixtures: function (match, params) { return JSON.stringify(VALID_RESPONSE); },
      pattern: '.*'
    }]);

    (new Goodtables()).run('data');
  });

  it('return Promise object', function(done, err) {
    if(err) done(err);

    require('superagent-mock')(request, [{
      callback: function (match, data) { return {text: data}; },
      fixtures: function (match, params) { return JSON.stringify(VALID_RESPONSE); },
      pattern: '.*'
    }]);

    (new Goodtables()).run('data').should.be.an.instanceOf(Promise);
    done();
  });

  it('reject with a message when connection failed', function(done, err) {
    if(err) done(err);

    require('superagent-mock')(request, [{
      callback: function(){ throw new Error(500); },
      fixtures: function (match, params) { return ''; },
      pattern: '.*'
    }]);

    (new Goodtables()).run('data').catch(function(E) { E.should.be.a('string'); done(); });
  });

  it('validate correct data', function(done, err) {
    if(err) done(err);

    require('superagent-mock')(request, [{
      callback: function (match, data) { return {text: data}; },
      fixtures: function (match, params) { return JSON.stringify(VALID_RESPONSE); },
      pattern: '.*'
    }]);

    (new Goodtables()).run('data').then(function(VR) { VR.isValid().should.be.true; done(); });
  });

  it('invalidate incorrect data', function(done, err) {
    if(err) done(err);

    require('superagent-mock')(request, [{
      callback: function (match, data) { return {text: data}; },
      fixtures: function (match, params) { return JSON.stringify(INVALID_RESPONSE); },
      pattern: '.*'
    }]);

    (new Goodtables()).run('data').then(function(VR) { VR.isValid().should.be.false; done(); });
  });
});
