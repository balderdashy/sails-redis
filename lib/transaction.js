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
  this.config = config;
}

/**
 * Connect to the redis instance
 */

Transaction.prototype.connect = function() {
  this.connection = utils.connect(this.config);
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
 *
 * @param {Function} callback
 */

Transaction.prototype.exec = function(callback) {
  var self = this;

  this.connect();
  this.connection.once('ready', function() {
    callback.call(self.connection); // Execute transaction block
    self.disconnect();
  });
};