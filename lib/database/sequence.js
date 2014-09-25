/**
 * Module Dependencies
 */

var Utils = require('../utils');

/**
 * Sequence.js
 *
 * Sequences represent auto-incrementing values. They are responsible for
 * tracking the last value available and can be incremented only.
 */

var Sequence = module.exports = function(collectionName, name, client) {

  // Escape the collection name
  var collection = collectionName.toLowerCase();

  // Cache the client connection
  this.client = client.connection;

  // Set the name of the sequence
  this.name = Utils.sanitize(name);

  // Build a NoSQL Key name for this sequence
  this.keyName = 'waterline:' + collectionName.toLowerCase() + ':_sequences:' + this.name;

  return this;
};


///////////////////////////////////////////////////////////////////////////////////////////
/// PUBLIC METHODS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Ensures a sequence exists and if not will create one and set the initial
 * value to zero.
 *
 * @param {Function} callback
 * @api private
 */

Sequence.prototype.initialize = function initialize(cb) {
  var self = this;

  this.client.get(this.keyName, function(err, sequence) {
    if(err) return cb(err);
    if(sequence) return cb();

    // Create a new sequence with the initial value of zero.
    self.client.set(self.keyName, 0, function(err) {
      if(err) return cb(err);
      cb();
    });
  });
};

/**
 * Get the current value of a sequence
 *
 * @param {Function} callback
 * @api public
 */

Sequence.prototype.get = function get(cb) {
  this.client.get(this.keyName, function(err, sequence) {
    if(err) return cb(err);
    cb(null, sequence);
  });
};

/**
 * Increment the value of a sequence
 *
 * @param {Function} callback
 * @api public
 */

Sequence.prototype.increment = function increment(cb) {
  this.client.incr(this.keyName, function(err, result) {
    if(err) return cb(err);
    cb(null, result);
  });
};

/**
 * Set A Sequence to a certain value
 *
 * @param {Integer} val
 * @param {Function} callback
 * @api public
 */

Sequence.prototype.set = function set(val, cb) {
  this.client.set(this.keyName, val, cb);
};
