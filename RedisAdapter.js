/*---------------------------------------------------------------
  :: sails-redis
  -> adapter
---------------------------------------------------------------*/

var async = require('async')
, _       = require('underscore')
, _str    = require('underscore.string')
, redis   = require('redis');

module.exports = (function(){

  // Keep track of Redis clients
  var clients = {};

  var adapter = {

    syncable: false,

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

      // Reuse existing connection(s)...
      clients[collection.identity] =  _.find(clients, function(client) {
        return collection.host === client.host;
      });

      // ...or create a new one
      if (!clients[collection.identity]) {
        clients[collection.identity] = marshalConfig(collection);
      }
      
      return cb();
    },

    // TODO: Add optional support for AOF before the adapter shuts down via teardown method

    create: function(collectionName, data, cb) {},

    find: function(collectionName, options, cb) {},

    stream: function(collectionName, options, stream) {},

    update: function(collectionName, options, values, cb) {},

    destroy: function(collectionName, options, cb) {},

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
      return redis.createClient(collection.port, collection.host, collection.options).auth(collection.password);
    } else {
      return redis.createClient(collection.port, collection.host, collection.options);
    }
    return cb();
  }
  
  return adapter;

})();