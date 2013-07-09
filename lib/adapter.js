/**
 * Adapter dependencies
 */

var utils = require('./utils'),
    Transaction = require('./transaction');

/**
 * Expose adapter
 */

module.exports = {
  identity: "waterline-redis",
  syncable: false,

  defaults: {
    port: 6379,
    host: 'localhost',
    password: null,
    options: {
      parser: 'hiredis',
      return_buffers: false,
      detect_buffers: false,
      socket_nodelay: true,
      no_ready_check: false,
      enable_offline_queue: true
    }
  },

  registerCollection: function(collection, callback) {
    var config = utils.serializeConfig(utils.extend(
      this.defaults,
      collection.config));

    // Initialize transaction object
    this.transaction = new Transaction(config);

    return callback();
  },

  create: function(collection, data, callback) {
    this.transaction.exec(function() {
      this.sadd(collection.identity, data);

      callback();
    });
  },

  find: function(collection, options, callback) {
    this.transaction.exec(function() {
      this.sget(collection.identity, data);


      callback();
    });
  },

  update: function(collection, options, values, callback) {
    this.transaction.exec(function() {
      this.sadd(collection.identity, data);


      callback();
    });
  },

  destroy: function(collection, options, callback) {
    this.transaction.exec(function() {
      this.sadd(collection.identity, data);


      callback();
    });
  },

  drop: function(name, callback) {
    this.transaction.exec(function() {
      this.del(name);

      callback();
    });
  }
};