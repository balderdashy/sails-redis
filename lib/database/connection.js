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

  if (config.options.onError) {
    client.on('error', config.options.onError);
  }

  var event = 'ready';
  if (config.options.no_ready_check) {
    event = 'connect';
  }

  //cant share the listener below as thats tied with waterline business
  if (config.options.onReady) {
    client.on(event, config.options.onReady);
  }

  //make the client listen on on rather than once, a reconnect happens it needs to run the cb
  client.once(event, function() {
    cb(null, client);
  });
};
