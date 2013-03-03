/*---------------------------------------------------------------
  :: sails-redis
  -> adapter
---------------------------------------------------------------*/

var async = require('async')
, _       = require('underscore')
, _.str   = require('underscore.string')
, redis   = require('redis')
, client  = redis.createClient();

module.exports = (function(){

  var adapter = {

    syncable: false,

    registerCollection: function(collection, cb) {},

    teardown: function(cb) {},

    describe: function(collectionName, cb) {},

    define: function(collectionName, definition, cb) {},

    drop: function(collectionName, cb) {},

    create: function(collectionName, data, cb) {},

    find: function(collectionName, options, cb) {},

    stream: function(collectionName, options, stream) {},

    update: function(collectionName, options, values, cb) {},

    destroy: function(collectionName, options, cb) {},

    identity: 'sails-redis'

  };

  return adapter;

  //////////////                 //////////////////////////////////////////
  ////////////// Private Methods //////////////////////////////////////////
  //////////////                 //////////////////////////////////////////



})();