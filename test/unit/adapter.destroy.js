/**
 * Test dependencies
 */

var async = require('async'),
    assert = require('assert'),
    Adapter = require('../../'),
    Support = require('../support')(Adapter),
    Errors = require('waterline-errors').adapter;

/**
 * Raw waterline-redis `.destroy()` tests
 */

describe('adapter `.destroy()`', function() {

  describe('with explicit id', function() {
    var model;

    before(function(done) {
      var definition = {
        id: {
          type: 'integer',
          primaryKey: true,
          autoIncrement: true
        },
        email: {
          type: 'string'
        },
        name: {
          type: 'string'
        }
      };

      Support.Setup('destroy', definition, function(err) {
        if(err) throw err;

        Adapter.create('destroy', { email: 'jaba@hotmail.com', name: 'Jaba the hut' }, function(err, m) {
          if(err) throw err;
          model = m;
          done();
        });
      });
    });

    after(function(done) {
      Support.Teardown('destroy', done);
    });

    it('should delete a record', function(done) {
      Adapter.destroy('destroy', { id: model.id }, function(err, status) {
        if(err) throw err;

        Adapter.find('destroy', { id: model.id }, function(err, models) {
          assert(err);
          assert(err.message === Errors.notFound.message);
          assert(!models);
          done();
        });
      });
    });
  });

  describe('with multiple records', function() {
    before(function(done) {
      var i, len;

      var definition = {
        id: {
          type: 'integer',
          primaryKey: true,
          autoIncrement: true
        },
        email: {
          type: 'string'
        },
        name: {
          type: 'string'
        }
      };

      Support.Setup('destroy', definition, function(err) {
        if(err) throw err;

        async.eachSeries([1, 2, 3, 4],
          function(i, done) {
            Adapter.create('destroy', { email: i, name: 'User ' + i }, done);
          },
          function(err) {
            if(err) throw err;
            done();
          }
        );
      });
    });

    after(function(done) {
      Support.Teardown('destroy', done);
    });

    it('should delete all records', function(done) {
      Adapter.destroy('destroy', { name: { startsWith: 'User' } }, function(err, status) {
        if(err) throw err;

        Adapter.find('destroy', {}, function(err, models) {
          if(err) throw err;

          assert(!models.length);
          done();
        });
      });
    });
  });

});
