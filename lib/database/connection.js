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

  client = config.password !== null ?
    redis.createClient(config.port, config.host, config.options).auth(config.password) :
    redis.createClient(config.port, config.host, config.options);

  var event = 'ready';
  if (config.no_ready_check) {
    event = 'connect';
  }

  if (config.onError) {
    client.on('error', config.onError);
  }

  //make the client listen on on rather than once, a reconnect happens it needs to run the cb
  client.on(event, function() {
    cb(null, client);
  });
};
