/**
 * Module Dependencies
 */

var _ = require('lodash'),
    async = require('async'),
    Utils = require('../utils'),
    Sequence = require('./sequence'),
    Indice = require('./indice'),
    hasOwnProperty = Utils.object.hasOwnProperty;


/**
 * Schema.js
 *
 * Keeps track of the "schema".
 */

var Schema = module.exports = function(connection) {

  // Hold the schema for each collection
  this._schema = {};

  // Holds unique indexes for each collection
  this._indices = {};

  // Holds the "primary key" attribute for each collection
  this._primary = {};

  // Holds any autoIncrementing sequences for each collection
  this._sequences = {};

  // Save the connection
  this._connection = connection;

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

Schema.prototype.registerCollection = function(collectionName, schema) {

  var name = collectionName.toLowerCase();

  schema = schema ? _.cloneDeep(schema) : {};

  this._schema[name] = schema;
  this._indices[name] = [];
  this._sequences[name] = [];

  for(var attr in schema) {
    if(hasOwnProperty(schema[attr], 'primaryKey')) this._primary[name] = attr;

    // Create an index for the attribute
    if(hasOwnProperty(schema[attr], 'unique')) {
      var indice = new Indice(name, attr, this._connection);
      this._indices[name].push(indice);
    }

    // Create a sequence for the attribute
    if(Utils.object.hasOwnProperty(schema[attr], 'autoIncrement')) {
      var sequence = new Sequence(name, attr, this._connection);
      this._sequences[name].push(sequence);
    }
  }
};

/**
 * Sync the schema to the database
 *
 * @param {Function} callback
 * @api public
 */

Schema.prototype.sync = function(cb) {
  var self = this;

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
  var keyName = Utils.replaceSpaces( key );
  return 'waterline:' + name + ':' + index + ':' + keyName;
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
      case 'date':
      case 'time':
      case 'datetime':
        values[key] = new Date(values[key]);
        break;
    }
  }

  return values;
};
