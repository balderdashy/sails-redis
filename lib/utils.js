/**
 * Utility dependencies
 */

var redis = require('redis');

/**
 * Expose adapter utility functions
 */

var utils = module.exports = exports;

/**
 * Serialize the configuration object
 *
 * @param {Object} collection
 * @return {Object}
 */

utils.serializeConfig = function serializeConfig(config) {
  return {
    port: config.port,
    host: config.host,
    options: config.options,
    password: config.password
  };
};

/**
 * Connect to redis instance
 *
 * @param {Object} config
 * @return {redis.Client}
 */

utils.connect = function connect(config) {
  return config.password !== null ?
    redis.createClient(config.port, config.host, config.options).auth(config.password) :
    redis.createClient(config.port, config.host, config.options);
};

/**
 * Create a new child object from `arguments`
 *  latter parents will overwrite previous
 *
 * @param {Object} parent...
 * @return {Object}
 */

utils.extend = function extend() {
  var i, len, child = {},
      p = Array.prototype.slice.call(arguments);

  for(i = 0, len = p.length; i < len; i = i + 1) {
    for(var k in p[i]) {
      child[k] = p[i][k] !== null && typeof p[i][k] === 'object' ?
        extend(child[k], p[i][k]) : p[i][k];
    }
  }

  return child;
};