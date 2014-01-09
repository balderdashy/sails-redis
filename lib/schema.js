/**
 * Module dependencies
 */

var utils = require('./utils'),
    extend = utils.extend;

/**
 * Expose `Schema`
 */

module.exports = Schema;

/**
 * Schema object
 * responsible to keeping track of schema and schema contraints
 */

function Schema() {

  // Hold the schema for a collection
  this._schema = {};

  // Holds unique indexes
  this._unique = {};

  // Holds the "primary key"
  this._primary = {};

  // Holds any autoIncrementing sequences
  this._sequences = {};

  return this;
}

/**
 * Register the given `schema`
 *
 * @param {String} collectionName
 * @param {Object} schema
 */

Schema.prototype.register = function(collectionName, schema) {
  var name = collectionName.toLowerCase();

  this._unique[name] = [];
  this._sequences[name] = [];

  for(var attr in schema) {
    if(schema[attr].unique) this._unique[name].push(attr);
    if(schema[attr].primaryKey) this._primary[name] = attr;
    if(schema[attr].autoIncrement) this._sequences[name].push(attr);
  }

  // Clone schema
  this._schema[name] = extend(schema);
};

/**
 * Return a clone of the previously registered schema
 * for `collection`
 *
 * @param {String} collectionName
 */

Schema.prototype.retrieve = function(collectionName) {
  var name = collectionName.toLowerCase();
  return extend(this._schema[name]);
};

/**
 * Retrieve the unique keys for `collection`
 *
 * @param {String} collectionName
 * @return {Array} clone of unique keys
 */

Schema.prototype.unique = function(collectionName) {
  var name = collectionName.toLowerCase();
  return this._unique[name].slice();
};

/**
 * Retrieve the primary key for `collection`
 *
 * @param {String} collectionName
 * @return {Array} clone of primary keys
 */

Schema.prototype.primary = function(collectionName) {
  var name = collectionName.toLowerCase();
  return this._primary[name];
};

/**
 * Retrieve auto increment keys for `collection`
 *
 * @param {String} collectionName
 * @return {Arry} clone of increments
 */

Schema.prototype.sequences = function(collectionName) {
  var name = collectionName.toLowerCase();
  return this._sequences[name].slice();
};

/**
 * Parse and cast data for `collection` based on schema.
 *
 * @param {String} collectionName
 * @param {String} str JSON string
 * @return {Object}
 */

Schema.prototype.parse = function(collectionName, str) {
  var name = collectionName.toLowerCase();
  var type, data = JSON.parse(str);

  if(!this._schema[name]) return data;

  for(var key in data) {
    if(!this._schema[name][key]) continue;

    switch(this._schema[name][key].type) {
      case 'data':
      case 'time':
      case 'datetime':
        data[key] = new Date(data[key]);
        break;
    }
  }

  return data;
};
