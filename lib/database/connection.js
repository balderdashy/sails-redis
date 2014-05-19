/**
 * Module Dependencies
 */

var redis = require('redis');

/**
 * Connection.js
 *
 * Handles connecting and disconnecting from a redis server.
 */

var Connection = module.exports = function(config) {

  // Hold Config parameters
  this.config = config;

  return this;

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
      multi,
      config = this.config;

  client = redis.createClient(config.port, config.host, config.options);
  if(config.password !== null) {
    client.auth(config.password);
  }

  client.once('ready', function() {
    cb(null, client);
  });
};
