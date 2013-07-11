/**
 * `Transaction` dependencies
 */

var redis = require('redis'),
    utils = require('./utils');

/**
 * Expose `Transaction`
 */

module.exports = Transaction;

/**
 * A container object for executing redis commands
 *
 * @param {Object} config
 */

function Transaction(config) {
  this.connection = null;
  this.definitions = {};
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
 * Return the key name for a record
 *
 * @param {String} collection
 * @param {Number|String} key
 */

Transaction.prototype.retrieveKey = function(collection, key) {
  var k = key ? ':' + key : '',
      pk = this.retrieve(collection);

  return 'waterline:' + collection + ':' + pk + k;
};

/**
 * Register primary key in `this.definitions`
 *
 * @param {Object} collection
 */

Transaction.prototype.register = function(collection) {
  var pk;

  // Retrieve primary key from schema definition
  if(typeof collection.definition.id !== 'undefined' &&
      collection.definition.id.primaryKey) {
    pk = 'id';
  } else {
    for(var attr in collection.definition) {
      if(collection.definition[attr].primaryKey) {
        pk = attr;
        break;
      }
    }
  }

  this.definitions[collection.identity] = pk;
};

/**
 * Retrieve registered primary key
 *
 * @param {String} collection
 */

Transaction.prototype.retrieve = function(collection) {
  var def = this.definitions[collection];

  if(typeof def === 'undefined') throw new Error(collection + ' not registered.');
  return def;
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

Transaction.prototype.disconnect = function(callback) {
  this.connection.quit();
  this.connection = null;
  if(typeof callback === 'function') {
    callback.apply(null, Array.prototype.slice.call(arguments, 1));
  }
};

/**
 * Execute `callback` in the context of `this.connection`
 *
 * @param {Function} callback
 */

Transaction.prototype.exec = function(callback) {
  var self = this;

  this.connect(function() {
    // On ready execute callback in the context of `this.connection`,
    // if there are arguments in the callback, pass disconnect to be called at the end.
    if(callback.length) return callback.call(self, self.disconnect.bind(self));

    // Otherwise just call the function, and disconnect.
    callback.call(self.connection);
    self.disconnect();
  });
};