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
  this._schema = {};
  this._unique = {};
  this._primary = {};
  this._increments = {};
}

/**
 * Register the given `schema`
 *
 * @param {String} collection
 * @param {Object} schema
 */

Schema.prototype.register = function(collection, schema) {
  this._unique[collection] = [];
  this._increments[collection] = [];

  for(var attr in schema) {
    if(schema[attr].unique) this._unique[collection].push(attr);
    if(schema[attr].primaryKey) this._primary[collection] = attr;
    if(schema[attr].autoIncrement) this._increments[collection].push(attr);
  }

  // Clone schema
  this._schema[collection] = extend(schema);
};

/**
 * Return a clone of the previously registered schema
 * for `collection`
 *
 * @param {String} collection
 */

Schema.prototype.retrieve = function(collection) {
  return extend(this._schema[collection]);
};

/**
 * Retrieve the unique keys for `collection`
 *
 * @param {String} collection
 * @return {Array} clone of unique keys
 */

Schema.prototype.unique = function(collection) {
  return this._unique[collection].slice();
};

 /**
  * Retrieve the primary key for `collection`
  *
  * @param {String} collection
  * @return {Array} clone of primary keys
  */

Schema.prototype.primary = function(collection) {
  return this._primary[collection];
};

/**
 * Retrieve auto increment keys for `collection`
 *
 * @param {String} collection
 * @return {Arry} clone of increments
 */

Schema.prototype.increments = function(collection) {
  return this._increments[collection].slice();
};

/**
 * Parse and cast data for `collection` based on schema.
 *
 * @param {String} collection
 * @param {String} str JSON string
 * @return {Object}
 */

Schema.prototype.parse = function(collection, str) {
  var type, data = JSON.parse(str);

  if(!this._schema[collection]) return data;

  for(var key in data) {
    if(!this._schema[collection][key]) continue;

    switch(this._schema[collection][key].type) {
      case 'data':
      case 'time':
      case 'datetime':
        data[key] = new Date(data[key]);
        break;
    }
  }

  return data;
};