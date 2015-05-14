/**
 * Module Dependencies
 */

/**
 * Connection.js
 *
 * Handles connecting and disconnecting from a redis server.
 *
 * @param {Object} config
 * @param {Function} callback
 */

var Connection = module.exports = function(config, cb) {

  var self = this;

  // Ensure something is set for config
  this.config = config || {};

  // Hold the connection
  this.connection = {};

  // Create a new Connection
  this.connect(function(err, client) {
    if(err) return cb(err);
    self.connection = client;
    cb(null, self);
  });

};


///////////////////////////////////////////////////////////////////////////////////////////
/// PUBLIC METHODS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Connect to the redis instance
 *
 * @param {Function} callback
 * @api public
 */

Connection.prototype.connect = function(cb) {
  var client,
      config = this.config;

  config.driver = config.driver || 'redis';
  var redis = require(config.driver);

  var drivers = {
      ioredis: function() {
        return redis.createClient(config);
      },
      redis: function() {
        return redis.createClient(config.port, config.host, config.options);
      }
  };

  client = drivers[config.driver]();
  if(config.password != null) {
    client.auth(config.password);
  }

  client.once('ready', function() {
    if(config.database != null) {
      client.select(config.database);
    }

    cb(null, client);
  });
};
