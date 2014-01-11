/**
 * Adapter dependencies
 */

var _ = require('lodash'),
    Utils = require('./utils'),
    Database = require('./database');

/**
 * Expose adapter
 */

module.exports = (function () {

  var database = new Database();

  return {
  identity: 'sails-redis',
  schema: false,
  syncable: false,

  /**
   * Default adapter configuration
   */

  defaults: {
    port: 6379,
    host: 'localhost',
    password: null,
    options: {
      return_buffers: false,
      detect_buffers: false,
      socket_nodelay: true,
      no_ready_check: false,
      enable_offline_queue: true
    }
  },

  /**
   * Register a collections schema
   *
   * @param {Object} collection
   * @param {Function} callback
   */

  registerCollection: function(collection, cb) {
    var name = collection.identity.toLowerCase();
    var config = Utils.serializeConfig(_.extend(this.defaults, collection.config));
    database.configure(name, config, collection.definition, cb);
  },

  /**
   * Describe a collection on `collection === tableName`
   *
   * @param {String} collectionName
   * @param {Function} callback
   */

  describe: function(collectionName, cb) {
    database.describe(collectionName, cb);
  },

  /**
   * Drop a collection on `collection === tableName`
   *
   * @param {String} collectionName
   * @param {Array} relations
   * @param {Function} callback
   */

  drop: function(collectionName, cb) {
    database.drop(collectionName, cb);
  },

  /**
   * Create a new record from `data`
   * - Ensure record unique keys are unique
   * - attempts to get meta data or creates them
   * - ensures the primary key is present and unique
   * - saves the data to database updating all unique index sets
   *
   * @param {String} collectionName
   * @param {Object} data
   * @param {Function} callback
   */

  create: function(collectionName, data, cb) {
    database.create(collectionName, data, cb);
  },

  /**
   * Find records based on criteria in `criteria`
   *
   * @param {String} collectionName
   * @param {Object} criteria
   * @param {Function} callback invoked with `err, records`
   */

  find: function(collectionName, criteria, cb) {
    database.find(collectionName, criteria, cb);
  },

  /**
   * Update records based on criteria
   *
   * @param {String} collection
   * @param {Object} criteria
   * @param {Object} values
   * @param {Function} callback invoked with `err, records`
   */

  update: function(collectionName, criteria, values, cb) {
    database.update(collectionName, criteria, values, cb);
  },

  /**
   * Destroy records based on criteria
   *
   * @param {String} collectionName
   * @param {Object} criteria
   * @param {Function} callback invoked with `err`
   */

  destroy: function(collectionName, criteria, cb) {
    database.destroy(collectionName, criteria, cb);
  },

  /**
   * Return the native redis object, user is responsible for
   * closing the redis connection later down the callback chain.
   *
   * @param {Function} callback invoked with `err, connection`
   */

  native: function(collectionName, cb) {
    var connection = database.schema._connections[collectionName];
    return cb(null, connection);
  }
};
})();
