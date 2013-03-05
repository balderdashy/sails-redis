/*---------------------------------------------------------------
  :: sails-redis
  -> adapter
---------------------------------------------------------------*/

var async = require('async')
, _       = require('underscore')
, _str    = require('underscore.string')
, redis   = require('redis');

module.exports = (function(){

  // Handle to a Redis connection
  var client = null;

  var adapter = {

    syncable: false,

    // This is here for testing purposes, until we figure out a way to run tests w/o transactions
    commitLog: {
      identity: '__default_waterline_redis_transaction',
      adapter: 'sails-redis'
    },

    defaults: {
      port: 6379,
      host: 'localhost',
      options: {
        parser: 'hiredis',
        return_buffers: false,
        detect_buffers: false,
        socket_nodelay: true,
        no_ready_check: false,
        enable_offline_queue: true
      },
      password: null
    },

    registerCollection: function(collection, cb) {
      connect(collection, cb);
    },

    create: function(collectionName, data, cb) {
      client.on("error", function (err) {
        console.log("Error " + err);
      });

      // Using the collectionName as a key, append a random integer - e.g., users_2940
      client.set(collectionName + '_' + Math.round(Math.random() * 10000), data);

      client.quit();

      cb();
    },

    find: function(collectionName, options, cb) {
      client.on("error", function (err) {
        console.log("Error " + err);
      });

      client.get(collectionName);

      client.quit();

      cb();
    },

    update: function(collectionName, options, values, cb) {
      // Overwrites old record!
      client.on("error", function (err) {
        console.log("Error " + err);
      });

      client.set(collectionName, values);

      client.quit();

      cb();
    },

    destroy: function(collectionName, options, cb) {
      client.on("error", function (err) {
        console.log("Error " + err);
      });

      client.del(collectionName);

      client.quit();

      cb();
    },

    identity: 'sails-redis'

  };

  //////////////                 //////////////////////////////////////////
  ////////////// Private Methods //////////////////////////////////////////
  //////////////                 //////////////////////////////////////////

  // Convert standard adapter config 
  // into a custom configuration object for redis
  function marshalConfig(config) {
    return _.extend(config, {
      port: config.port,
      host: config.host,
      options: config.options,
      password: config.password
    });
  }

  function connect(collection, cb) {
    if(collection.password != null) {
      client = redis.createClient(collection.port, collection.host, collection.options).auth(collection.password);
    } else {
      client = redis.createClient(collection.port, collection.host, collection.options);
    }
    return cb();
  }
  
  return adapter;

})();