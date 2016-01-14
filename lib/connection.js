/**
 * Module Dependencies
 */

var redis = require('redis');
var url = require("url");

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

  var log = console.error;
      try {
          log = ( typeof sails == undefined ) ? console.error : sails.log.error;
      } catch (e){}

  // parse redis url for config options
  if (config.url !== undefined) {
    var redisUrl = url.parse(config.url);
    config.host = config.host || redisUrl.hostname;
    config.port = config.port || redisUrl.port;
    if (config.options && !config.options.auth_pass && redisUrl.auth) {
      config.options.auth_pass = redisUrl.auth.split(":")[1];
    }
  }

  client = redis.createClient(config.port, config.host, config.options);
  
  var readyFired = false;
  var lastError;

  if(config.password != null) {
    client.auth(config.password);
  }

  client.once('ready', function() {
    if(config.database != null) {
      client.select(config.database);
    }

    readyFired = true;
    
    cb(null, client);
  });

  client.on('end', function() {
    // check that it exited before ready (i.e. before it connected successfully),
    // and that an error was received
    if (!readyFired && lastError) {
      cb(lastError);
    }
  });
  
  client.on('error', function (err) {
    lastError = err;
    
    log('RedisClient::Events[error], ',  err);

    if (/ECONNREFUSED/g.test(err)) {
        log('Waiting for redis client to come back online. Connections:', client.connections);
    }
  });
};
