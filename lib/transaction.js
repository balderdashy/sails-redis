/**
 * `Transaction` dependencies
 */

var async = require('async'),
    redis = require('redis'),
    utils = require('./utils'),
    errors = require('waterline-errors'),
    present = utils.present,
    adapterErrors = errors.adapter;

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
 * Return the key name used for collection's meta data
 *
 * @param {String} collection
 * @return {String}
 */

Transaction.prototype.metaKey = function(collection) {
  return 'waterline:' + collection + ':_meta';
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
  var connection, config = this.config;

  connection = config.password !== null ?
    redis.createClient(config.port, config.host, config.options).auth(config.password) :
    redis.createClient(config.port, config.host, config.options);

  connection.once('ready', function() {
    callback(connection);
  });
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
  this.connect(function(connection) {
    callback.call(connection, function() {
      connection.quit();
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

Transaction.prototype.isUnique = function(connection, collection, data, callback) {
  var error = null,
      unique = this.schema.unique(collection);

  // Ensure every key is unique
  async.every(unique, exists.bind(this), function(unique) {
    callback(error, unique);
  });

  function exists(key, callback) {
    if (typeof data[key] === 'undefined') {
      return callback(true);
    }
    var index = this.indexKey(collection, key),
        record = this.recordKey(collection, key, this.sanitize(data[key]));

    connection.sismember(index, record, function(err, found) {
      if(err) error = err;
      callback(!found);
    });
  }
};

/**
 * Ensure no auto increment keys are set, and add them.
 *
 * @param {String} collection
 * @param {Object} data
 * @param {Function} callback
 */

Transaction.prototype.setIncrements = function(connection, collection, data, callback) {
  var i, len,
      redis = connection,
      metaKey = this.metaKey(collection),
      primary = this.schema.primary(collection),
      increments = this.schema.increments(collection);

  if(!present(data[primary]) && !~increments.indexOf(primary)) {
    return callback(adapterErrors.primaryKeyMissing);
  }

  for(i = 0, len = increments.length; i < len; i = i + 1) {
    if(present(data[increments[i]])) {
      return callback(adapterErrors.invalidAutoIncrement);
    }
  }

  redis.get(metaKey, function(err, meta) {
    if(err) return callback(err);

    // Support for changed schema without `flushdb`
    meta = utils.extend(defaultMeta(), JSON.parse(meta));

    for(i = 0, len = increments.length; i < len; i = i + 1) {
      data[increments[i]] = meta.increments[increments[i]]++;
    }

    redis.set(metaKey, JSON.stringify(meta), function(err) {
      if(err) return callback(err);
      return callback(null, data);
    });
  });

  function defaultMeta() {
    var attributes = {};

    for(i = 0, len = increments.length; i < len; i = i + 1) {
      attributes[increments[i]] = 1;
    }

    return {
      increments: attributes
    };
  }
};