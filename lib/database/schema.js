/**
 * Module Dependencies
 */

var _ = require('lodash'),
    async = require('async'),
    Utils = require('../utils'),
    Connection = require('./connection'),
    Sequence = require('./sequence'),
    Indice = require('./indice');


/**
 * Schema.js
 *
 * Keeps track of the "schema".
 */

var Schema = module.exports = function() {

  // Hold Connection for each collection
  // (collections with the same config will share a connection)
  this._connections = {};

  // Hold Connection Config Objects
  this._config = {};

  // Hold the schema for each collection
  this._schema = {};

  // Holds unique indexes for each collection
  this._indices = {};

  // Holds the "primary key" attribute for each collection
  this._primary = {};

  // Holds any autoIncrementing sequences for each collection
  this._sequences = {};

  return this;

};


///////////////////////////////////////////////////////////////////////////////////////////
/// PUBLIC METHODS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Register the given `schema` for a collection
 *
 * @param {String} collectionName
 * @param {Object} schema
 * @param {Object} config
 * @param {Function} callback
 * @api public
 */

Schema.prototype.registerCollection = function(collectionName, schema, config, cb) {

  var self = this,
      name = collectionName.toLowerCase();

  // Ensure values are set for arguments
  schema = schema || {};
  config = config || {};

  // Grab a connection and build up schema properties
  this._getConnection(name, config, function(err) {
    if(err) return cb(err);

    var connection = self._connections[collectionName];

    self._indices[name] = [];
    self._sequences[name] = [];

    for(var attr in schema) {
      if(Utils.object.hasOwnProperty(schema[attr], 'primaryKey')) self._primary[name] = attr;

      // Create an index for the attribute
      if(Utils.object.hasOwnProperty(schema[attr], 'unique')) {
        var indice = new Indice(name, attr, connection);
        self._indices[name].push(indice);
      }

      // Create a sequence for the attribute
      if(Utils.object.hasOwnProperty(schema[attr], 'autoIncrement')) {
        var sequence = new Sequence(name, attr, connection);
        self._sequences[name].push(sequence);
      }
    }

    // Clone schema
    self._schema[name] = _.clone(schema);

    // If no sequences were detected, just return the callback
    if(Object.keys(self._sequences).length === 0) return cb();

    // If any sequences were found, sync them with redis
    var sequencesToSync = [];
    Object.keys(self._sequences).forEach(function(collection) {
      self._sequences[collection].forEach(function(sequence) {
        sequencesToSync.push(sequence);
      });
    });

    async.each(sequencesToSync, function(sequence, next) {
      sequence.initialize(next);
    }, cb);
  });

};

/**
 * Return a clone of the previously registered schema
 * for `collection`
 *
 * @param {String} collectionName
 * @api public
 */

Schema.prototype.retrieve = function(collectionName) {
  var name = collectionName.toLowerCase();
  return _.clone(this._schema[name]);
};

/**
 * Return the key name for an index
 *
 * @param {String} collectionName
 * @param {Number|String} index optional
 * @api public
 */

Schema.prototype.indexKey = function(collectionName, index) {
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

Schema.prototype.recordKey = function(collectionName, index, key) {
  var name = collectionName.toLowerCase();
  return 'waterline:' + name + ':' + index + ':' + key;
};

/**
 * Parse and cast data for `collection` based on schema.
 *
 * @param {String} collectionName
 * @param {Object} values
 * @return {Object}
 */

Schema.prototype.parse = function(collectionName, values) {
  var name = collectionName.toLowerCase(),
      type;

  if(!this._schema[name]) return values;

  for(var key in values) {
    if(!this._schema[name][key]) continue;

    switch(this._schema[name][key].type) {
      case 'data':
      case 'time':
      case 'datetime':
        values[key] = new Date(values[key]);
        break;
    }
  }

  return values;
};


///////////////////////////////////////////////////////////////////////////////////////////
/// PRIVATE METHODS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Build A Connection for a collection.
 *
 * @param {String} collectionName
 * @param {Object} config
 * @param {Function} callback
 * @api private
 */

Schema.prototype._getConnection = function _getConnection(collectionName, config, cb) {
  var self = this;

  // Check if any collection's share the same config object
  Object.keys(this._config).forEach(function(collection) {
    if(self._config[collection] !== config) return;

    // If a collection shares the same config they should be able to use the
    // same connection object.
    self._connections[collectionName] = self._connections[collection];
  });

  // Set the config into the schema config and return the connection
  // if they can be shared
  if(self._connections[collectionName]) {
    self._config[collectionName] = config;
    return cb(null, self._connections[collectionName]);
  }

  // If this collection uses a different config object
  // a new connection will need to be spun up.
  var connection = new Connection(config);

  connection.connect(function(err, client) {
    if(err) return cb(err);
    self._connections[collectionName] = client;
    cb();
  });

};
