/**
 * Test dependencies
 */

var assert = require('assert'),
    Adapter = require('../../'),
    Support = require('../support')(Adapter);

/**
 * Raw waterline-redis `.drop()` tests
 */

describe('adapter `.drop()`', function() {
  before(function(done) {
    var definition = {
      id: {
        type: 'integer',
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: 'string',
        unique: true
      }
    };

    Support.Setup('drop', definition, function(err) {
      if(err) throw err;

      Adapter.create('drop', { email: 'jabba@hotmail.com' }, function(err) {
        if(err) throw err;
        done();
      });
    });
  });

  it('should create all index sets', function(done) {
    Adapter._transaction.exec(done, function(callback) {
      var redis = this;

      redis.exists('waterline:drop:_meta', function(err, exists) {
        if(err) throw err;
        assert(exists);

        redis.exists('waterline:drop:id', function(err, exists) {
          if(err) throw err;
          assert(exists);

          redis.exists('waterline:drop:email', function(err, exists) {
            if(err) throw err;
            assert(exists);
            callback();
          });
        });
      });
    });
  });

  it('should drop all index sets', function(done) {
    Adapter.drop('drop', function(err) {
      assert(!err);

      Adapter._transaction.exec(done, function(callback) {
        var redis = this;

        redis.exists('waterline:drop:_meta', function(err, exists) {
          if(err) throw err;
          assert(!exists);

          redis.exists('waterline:drop:id', function(err, exists) {
            if(err) throw err;
            assert(!exists);

            redis.exists('waterline:drop:email', function(err, exists) {
              if(err) throw err;
              assert(!exists);
              callback();
            });
          });
        });
      });
    });
  });

});