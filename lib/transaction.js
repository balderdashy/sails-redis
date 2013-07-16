/**
 * `Transaction` dependencies
 */

var async = require('async'),
    redis = require('redis'),
    utils = require('./utils');

/**
 * Expose `Transaction`
 */

module.exports = Transaction;

/**
 * A container object for executing redis commands, and
 * retrieve general information for key sets
 */

function Transaction() {
  this.config = {};
  this.schema = null;
  this.connection = null;
}

/**
 * Overwrite config object with a new config object.
 *
 * @param {Object} config
 */

Transaction.prototype.configure = function(config) {
  this.config = utils.extend(this.config, config);
};

/**
 * Register the `schema` with transaction
 *
 * @param {Object} schema
 */

Transaction.prototype.registerSchema = function(schema) {
  if(!this.schema) this.schema = schema;
};

/**
 * Return the key name for an index
 *
 * @param {String} collection
 * @param {Number|String} key optional
 */

Transaction.prototype.indexKey = function(collection, index) {
  return 'waterline:' + collection + ':' + index;
};

/**
 * Return the key name for a record
 *
 * @param {String} collection
 * @param {String} index
 * @param {String} key
 */

Transaction.prototype.recordKey = function(collection, index, key) {
  return 'waterline:' + collection + ':' + index + ':' + key;
};

/**
 * Sanitize a key removing any spaces or reserved charaters
 *
 * @param {String} str
 */

Transaction.prototype.sanitize = function(str) {
  return typeof str === 'string' ? str.replace(/\s+/g, '_') : str;
};

/**
 * Connect to the redis instance
 *
 * @param {Function} callback
 */

Transaction.prototype.connect = function(callback) {
  var config = this.config;

  if(this.connection !== null) return callback();
  this.connection = config.password !== null ?
    redis.createClient(config.port, config.host, config.options).auth(config.password) :
    redis.createClient(config.port, config.host, config.options);

  this.connection.once('ready', callback);
};

/**
 * Disconnect from the redis instance
 */

Transaction.prototype.disconnect = function() {
  this.connection.quit();
  this.connection = null;
};

/**
 * Execute `callback` in the context of `this.connection`
 * `done` is called after transaction is completed, passing any arguments
 * passed to the `this.exec` callback
 *
 * @param {Function} done called when transaction is complete
 * @param {Function} callback called on connection
 */

Transaction.prototype.exec = function(done, callback) {
  var self = this;

  this.connect(function() {
    callback.call(self, function() {
      self.disconnect();
      return done.apply(null, arguments);
    });
  });
};

/**
 * Check to ensure the data is unique to the schema,
 * connection to redis should already be established.
 *
 * @param {String} collection
 * @param {Object} data
 * @param {Function} callback
 */

Transaction.prototype.isUnique = function(collection, data, callback) {
  var self = this,
      error = null,
      unique = this.schema.unique(collection);

  // Ensure every key is unique
  async.every(unique, exists.bind(this), function(unique) {
    return callback(error, unique);
  });

  function exists(key, callback) {
    var index = this.indexKey(collection, key),
        record = this.recordKey(collection, key, this.sanitize(data[key]));

    this.connection.sismember(index, record, function(err, found) {
      if(err) error = err;
      return callback(!found);
    });
  }
};