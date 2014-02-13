/**
 * Test dependencies
 */

var assert = require('assert'),
    Adapter = require('../../'),
    Support = require('../support')(Adapter);

/**
 * Raw waterline-redis `.describe()` tests
 */

describe('adapter `.describe()`', function() {

  describe('with simple case', function() {
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

      Support.Setup('describe', 'simple', definition, function(err) {
        if(err) return done(err);
        Adapter.define('describe', 'simple', definition, done);
      });
    });

    after(function(done) {
      Support.Teardown('describe', 'simple', done);
    });

    it('should properly describe attributes', function(done) {
      Adapter.describe('describe', 'simple', function(err, definition) {
        if(err) throw err;
        console.log('def', definition)
        assert(definition.id.primaryKey);
        assert(definition.id.type === 'integer');
        assert(definition.name.type === 'string');
        done();
      });
    });
  });

  describe('with complex case', function() {
    before(function(done) {
      var definition = {
        id: {
          type: 'integer',
          primaryKey: true
        },
        name: {
          type: 'string',
          unique: true
        },
        email: {
          type: 'string',
          unique: true
        },
        age: {
          type: 'integer',
          unique: true,
          autoIncrement: true
        }
      };

      Support.Setup('describe', 'complex', definition, function(err) {
        if(err) return done(err);
        Adapter.define('describe', 'complex', definition, done);
      });
    });

    after(function(done) {
      Support.Teardown('describe', 'complex', done);
    });

    it('should properly describe attributes', function(done) {
      Adapter.describe('describe', 'complex', function(err, definition) {
        if(err) throw err;

        assert(definition.id.primaryKey);
        assert(definition.name.unique);
        assert(definition.email.unique);
        assert(definition.age.unique);
        assert(definition.id.type === 'integer');
        assert(definition.name.type === 'string');
        assert(definition.email.type === 'string');
        assert(definition.age.type === 'integer');
        done();
      });
    });
  });
});
