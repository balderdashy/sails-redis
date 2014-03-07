/**
 * Test dependencies
 */

var assert = require('assert'),
    Adapter = require('../../'),
    Support = require('../support')(Adapter),
    Errors = require('waterline-errors').adapter;

/**
 * Raw waterline-redis key-value pair tests
 */

describe('adapter kv-pair support ', function() {

    describe('kv pair set/get/remove', function() {
        before(function(done) {
            var definition = {
                foo: {
                    type: 'int'
                },
                bar: {
                    type: 'string'
                }
            };

            Support.Setup('foobar', definition, done);
        });

        after(function(done) {
            Support.Teardown('foobar', done);
        });

        it('should set a KV pair', function(done) {
            var attributes = {
                foo: 1,
                bar: 'Darth Maul'
            };

            Adapter.set('foobar', 'maulKey', attributes, function(err, model) {
                if(err) throw err;
                assert(model.foo === 1);
                assert(model.bar === 'Darth Maul');
                done();
            });
        });

        it('should retrieve KV pair', function(done) {
            Adapter.get('foobar', 'maulKey', function(err, model) {
                if(err) throw err;
                assert(model.foo === 1);
                assert(model.bar === 'Darth Maul');
                done();
            });
        });

        it('should remove KV pair', function(done) {
            Adapter.remove('foobar', 'maulKey', function(err, result) {
                if(err) throw err;
                assert(result === 1);
                done();
            });
        });

        it('should not find KV pair', function(done) {
            Adapter.get('foobar', 'maulKey', function(err, model) {
                if(err) throw err;
                assert(model === null);
                done();
            });
        });
    });

    describe('kv pair with expire', function() {
        before(function(done) {
            var definition = {
                guitar: {
                    type: 'string'
                },
                vocal: {
                    type: 'string'
                }
            };

            Support.Setup('classicbands', definition, done);
        });

        after(function(done) {
            Support.Teardown('classicbands', done);
        });

        it('should set an expiring KV pair', function(done) {
            var attributes = {
                guitar: 'Jimmy Page',
                vocal: 'Robert Plant'
            };

            Adapter.setWithTTL('classicbands', 'ledZepKey', attributes, 1, function(err, model) {
                if(err) throw err;
                assert(model.guitar === 'Jimmy Page');
                assert(model.vocal === 'Robert Plant');
                done();
            });
        });

        it('should retrieve KV pair', function(done) {
            Adapter.get('classicbands', 'ledZepKey', function(err, model) {
                if(err) throw err;
                assert(model.guitar === 'Jimmy Page');
                assert(model.vocal === 'Robert Plant');

                setTimeout(function(){
                    done();
                }, 1500);
            });
        });

        it('should not find KV pair', function(done) {
            Adapter.get('classicbands', 'ledZepKey', function(err, model) {
                if(err) throw err;
                assert(model === null);
                done();
            });
        });
    });

});
