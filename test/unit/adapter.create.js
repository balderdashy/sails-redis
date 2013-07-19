var assert = require('assert'),
    Adapter = require('../../'),
    Support = require('../support')(Adapter),
    Errors = require('waterline-errors').adapter;

/**
 * Raw adapter creation tests
 */

describe('create', function() {

  describe('with numeric id', function() {
    before(function(done) {
      var definition = {
        id: {
          type: 'integer',
          primaryKey: true
        },
        name: {
          type: 'string'
        }
      };

      Support.Setup('numeric', definition, done);
    });

    after(function(done) {
      Support.Teardown('numeric', done);
    });

    it('should properly create a new record', function(done) {
      var attributes = {
        id: 1,
        name: 'Darth Vader'
      };

      Adapter.create('numeric', attributes, function(err, model) {
        if(err) throw err;

        assert(model.id === 1);
        assert(model.name === 'Darth Vader');
        done();
      });
    });
  });

  describe('with primary string key', function() {
    before(function(done) {
      var definition = {
        email: {
          type: 'string',
          primaryKey: true
        },
        name: {
          type: 'string'
        }
      };

      Support.Setup('string', definition, done);
    });

    after(function(done) {
      Support.Teardown('string', done);
    });

    it('should properly create a new record', function(done) {
      var attributes = {
        name: 'Han Solo',
        email: 'han.solo@yahoo.com'
      };

      Adapter.create('string', attributes, function(err, model) {
        if(err) throw err;

        assert(model.name === 'Han Solo');
        assert(model.email === 'han.solo@yahoo.com');
        done();
      });
    });

    it('should return error on non-auto incrementing primary key', function(done) {
      Adapter.create('string', { name: 'Luke Skywalker' }, function(err, model) {
        assert(err);
        assert(err.message === Errors.primaryKeyMissing.message);
        done();
      });
    });
  });
});