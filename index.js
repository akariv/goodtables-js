var _ = require('underscore');
var Promise = require('bluebird');
var API_URL = 'http://goodtables.okfnlabs.org/api/';
var base64 = require('base64-js');
require('es6-promise').polyfill();
require('isomorphic-fetch');


function ValidationReport(report, options) {
  this.rawResults = report.results;
  this.headers = report.meta.headers;
  this.encoding = report.meta.encoding;

  if(options.isGrouped)
    // Grouped report structure
    this.errors = _.reduce(report.results, function(R, V) {
      return R.concat(_.chain(V)
        .map(function(V, K) { return _.where(V.results, {result_level: 'error'}) })
        .flatten()
        .value());
    }, []);
  else
    // Basic report structure
    this.errors = _.where(report.results, {result_level: 'error'});

  return this;
}

ValidationReport.prototype.getHeaders = function() { return this.headers; }
ValidationReport.prototype.getEncoding = function() { return this.encoding; }
ValidationReport.prototype.getGroupedByRows = function() { return this.rawResults; }
ValidationReport.prototype.getValidationErrors = function() { return this.errors; }
ValidationReport.prototype.isValid = function() { return !Boolean(this.errors.length); }

function convertToGetParams(params) {
  return _.map(params, function(value, key){
    return encodeURIComponent(key)+'='+encodeURIComponent(value);
  }).join('&');
}

var GoodTables = function(options, userEndpointURL) {
  // Provide default values for most params
  this.userEndpointURL = userEndpointURL;
  this.options = _.extend({
    fail_fast        : true,
    format           : 'csv',
    ignore_empty_rows: false,
    method           : 'get',
    report_limit     : 1000,
    report_type      : 'basic',
    row_limit        : 20000,
    byte_limit       : 16*1024
  }, options);

  if(!_.contains(['get', 'post'], this.options.method))
    throw new Error('.method should be "get" or "post"');

  return this;
}

GoodTables.prototype.run = function (data, schema, data_url) {
  if(!data && !data_url) {
    throw new Error('You need to provide data file to validate');
  }

  return new Promise((function(RS, RJ) {
    var params = _.omit(this.options, 'method');
    if ( schema ) { params.schema = schema; }
    if ( data ) {
      if ( data instanceof ArrayBuffer ) {
        var byteView = new Uint8Array(data);
        if ( byteView.length > this.options.byte_limit ) {
          var bl = this.options.byte_limit;
          var cutoff = byteView.indexOf(10, bl - 1024);
          if ( cutoff === -1 || cutoff > bl ) {
            byteView = byteView.subarray(0,bl);
          } else {
            byteView = byteView.subarray(0,cutoff);
          }
        }
        params.data_base64 = base64.fromByteArray(byteView);
      } else {
        params.data = data;
      }
    }
    if ( data_url ) { params.data_url = data_url; }
    var url = this.userEndpointURL || API_URL + 'run';
    var options = {};
    if (this.options.method == 'get'){
      url = url + '?' + convertToGetParams(params);
      options = {method: this.options.method.toUpperCase()};
    } else {
      options = {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: this.options.method.toUpperCase(),
        body: JSON.stringify(params)
      };
    }

    fetch(url, options)
      .then(
      function (res){
        if (res.status != 200) {
          RJ('API request failed: ' + res.status);
        }
        return res.text();
      }
    ).then(
      (function (text) {
        RS(new ValidationReport(JSON.parse(text).report, {isGrouped: this.options.report_type === 'grouped'}));
      }).bind(this)
    );
  }).bind(this));
}

module.exports = GoodTables;
