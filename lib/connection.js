/**
 * Module Dependencies
 */

var async = require('async'),
    redis = require('redis'),
    utils = require('./utils'),
    errors = require('waterline-errors'),
    present = utils.present,
    adapterErrors = errors.adapter;

/**
 * Expose `Connection`
 */

module.exports = Connection;

/**
 * A container object for executing redis commands, and
 * retrieve general information for key sets.
 */

function Connection() {
  this.config = {};
  this.schema = null;
}

/****************************************************************
 * PUBLIC METHODS
 ****************************************************************/


/**
 * Overwrite config object with a new config object.
 *
 * @param {Object} config
 */

Connection.prototype.configure = function(config) {
  this.config = utils.extend(this.config, config);
};

/**
 * Return a Connection Object
 *
 * @param {Function} callback
 */

Connection.prototype.connection = function(cb) {
  this._connect(function(err, client) {
    if(err) return cb(err);
    cb(null, client);
  });
};

/**
 * Return the key name for an index
 *
 * @param {String} collectionName
 * @param {Number|String} key optional
 * @api public
 */

Connection.prototype.indexKey = function(collectionName, index) {
  var name = collectionName.toLowerCase();
  return 'waterline:' + name + ':' + index;
};

/**
 * Return the key name for a record
 *
 * @param {String} collectionName
 * @param {String} index
 * @param {String} key
 * @api public
 */

Connection.prototype.recordKey = function(collectionName, index, key) {
  var name = collectionName.toLowerCase();
  return 'waterline:' + name + ':' + index + ':' + key;
};

/**
 * Return the key name used for collection's sequences (auto-incrementing fields)
 *
 * @param {string} collectionName
 * @return {String}
 * @api public
 */

Connection.prototype.sequenceKey = function(collectionName) {
  var name = collectionName.toLowerCase();
  return 'waterline:' + name + ':_sequences';
};

/**
 * Return the key name used for collection's unique indexes
 *
 * @param {string} collectionName
 * @return {String}
 * @api public
 */

Connection.prototype.uniqueKey = function(collectionName) {
  var name = collectionName.toLowerCase();
  return 'waterline:' + name + ':_unique';
};


/****************************************************************
 * PRIVATE METHODS
 ****************************************************************/


/**
 * Connect to the redis instance
 *
 * @param {Function} callback
 */

Connection.prototype._connect = function(cb) {
  var client,
      multi,
      config = this.config;

  client = config.password !== null ?
    redis.createClient(config.port, config.host, config.options).auth(config.password) :
    redis.createClient(config.port, config.host, config.options);

  client.once('ready', function() {
    multi = client.multi();
    cb(null, { multi: multi, client: client });
  });
};
