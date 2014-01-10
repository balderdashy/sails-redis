/**
 * Test dependencies
 */

var assert = require('assert'),
    Adapter = require('../../'),
    Support = require('../support')(Adapter),
    Errors = require('waterline-errors').adapter;

/**
 * Raw waterline-redis `.update()` tests
 */

describe('adapter `.update()`', function() {

  describe('with simple attributes', function() {
    before(function(done) {
      var definition = {
        id: {
          type: 'integer',
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: 'string'
        }
      };

      Support.Setup('update', definition, function(err) {
        if(err) throw err;
        Adapter.create('update', { name: 'Walter' }, done);
      });
    });

    after(function(done) {
      Support.Teardown('update', done);
    });

    it('should properly update attributes', function(done) {
      Adapter.update('update', { id: 1 }, { name: 'Sobchak' }, function(err, model) {
        if(err) throw err;

        assert(model[0].id === 1);
        assert(model[0].name === 'Sobchak');
        done();
      });
    });
  });

  describe('with a complex case', function() {
    before(function(done) {
      var definition = {
        id: {
          type: 'integer',
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: 'string',
          unique: true
        },
        number: {
          type: 'integer',
          unique: true
        }
      };

      Support.Setup('update', definition, function(err) {
        if(err) throw err;

        Adapter.create('update', { name: 'The Dude', number: 1 }, function(err) {
          if(err) throw err;
          Adapter.create('update', { name: 'Donny', number: 3 }, done);
        });
      });
    });

    after(function(done) {
      Support.Teardown('update', done);
    });

    it('should check for unique values', function(done) {
      Adapter.update('update', { where: { name: 'The Dude' }}, { number: 3 }, function(err) {
        assert(err);
        assert(err.message === Errors.notUnique.message);
        done();
      });
    });
  });
});
