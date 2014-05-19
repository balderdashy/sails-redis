/**
 * Test dependencies
 */

var assert = require('assert'),
    Adapter = require('../../'),
    Support = require('../support')(Adapter),
    Errors = require('waterline-errors').adapter;

/**
 * Raw waterline-redis `.create()` tests
 */

describe('adapter `.create()`', function() {

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

      Support.Setup('create', 'numeric', definition, done);
    });

    after(function(done) {
      Support.Teardown('create', 'numeric', done);
    });

    it('should properly create a new record', function(done) {
      var attributes = {
        id: 1,
        name: 'Darth Vader'
      };

      Adapter.create('create', 'numeric', attributes, function(err, model) {
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

      Support.Setup('create', 'string', definition, done);
    });

    after(function(done) {
      Support.Teardown('create', 'string', done);
    });

    it('should properly create a new record', function(done) {
      var attributes = {
        name: 'Han Solo',
        email: 'han.solo@yahoo.com'
      };

      Adapter.create('create', 'string', attributes, function(err, model) {
        if(err) throw err;

        assert(model.name === 'Han Solo');
        assert(model.email === 'han.solo@yahoo.com');
        done();
      });
    });

    it('should return error on non-auto incrementing primary key', function(done) {
      Adapter.create('create', 'string', { name: 'Luke Skywalker' }, function(err, model) {
        assert(err);
        assert(err.message === Errors.PrimaryKeyMissing.message);
        done();
      });
    });
  });

  describe('with unique attributes', function() {
    before(function(done) {
      var definition = {
        id: {
          type: 'integer',
          primaryKey: true
        },
        email: {
          type: 'string',
          unique: true
        }
      };

      Support.Setup('create', 'unique', definition, done);
    });

    after(function(done) {
      Support.Teardown('create', 'unique', done);
    });

    it('should not create record with non-unique attributes', function(done) {
      var attributes = {
        id: 1,
        email: 'darth@hotmail.com'
      };

      Adapter.create('create', 'unique', attributes, function(err, model) {
        if(err) throw err;

        Adapter.create('create', 'unique', attributes, function(err, model) {
          assert(err);
          assert(err.message === Errors.NotUnique.message);
          assert(!model);
          done();
        });
      });
    });

    it('should create record with unique attributes', function(done) {
      Adapter.create('create', 'unique', { id: 2, email: 'han@hotmail.com' }, function(err, model) {
        if(err) throw err;

        assert(model);
        assert(model.id === 2);
        assert(model.email === 'han@hotmail.com');

        Adapter.create('create', 'unique', { id: 3, email: 'luke@hotmail.com' }, function(err, model) {
          if(err) throw err;

          assert(model);
          assert(model.id === 3);
          assert(model.email === 'luke@hotmail.com');
          done();
        });
      });
    });
  });

  describe('with auto incrementing attributes', function() {
    before(function(done) {
      var definition = {
        id: {
          type: 'integer',
          primaryKey: true,
          autoIncrement: true
        },
        age: {
          type: 'integer',
          autoIncrement: true
        },
        number: {
          type: 'integer',
          autoIncrement: true
        }
      };

      Support.Setup('create', 'auto', definition, done);
    });

    after(function(done) {
      Support.Teardown('create', 'auto', done);
    });

    it('should create record with auto increments', function(done) {
      Adapter.create('create', 'auto', {}, function(err, model) {
        if(err) throw err;

        assert(model);
        assert(model.id === 1);
        assert(model.age === 1);
        assert(model.number === 1);
        done();
      });
    });
  });

});
