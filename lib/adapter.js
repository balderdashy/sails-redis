/**
 * Adapter dependencies
 */

var _ = require('lodash');
var Utils = require('./utils');
var Connection = require('./connection');
var Database = require('./database');
var _runJoins = require('waterline-cursor');

/**
 * Expose adapter
 */

module.exports = (function () {

  // Keep track of all the connections used by the app
  var connections = {};

  var adapter = {

    identity: 'sails-redis',

    // Which type of primary key is used by default
    pkFormat: 'integer',

    // Track schema internally
    syncable: false,

    // Default Schema setting
    schema: false,

    /**
     * Default adapter configuration
     */

    defaults: {
      port: 6379,
      host: 'localhost',
      password: null,
      database: null,
      options: {
        return_buffers: false,
        detect_buffers: false,
        socket_nodelay: true,
        no_ready_check: false,
        enable_offline_queue: true
      }
    },

    /**
     * Register A Connection
     *
     * Will open up a new connection using the configuration provided and store the DB
     * object to run commands off of.
     *
     * @param {Object} connection
     * @param {Object} collections
     * @param {Function} callback
     */

    registerConnection: function(connection, collections, cb) {

      if(!connection.identity) return cb(new Error('Connection is missing an identity'));
      if(connections[connection.identity]) return cb(new Error('Connection is already registered'));

      // Store the connection
      connections[connection.identity] = {
        config: connection,
        collections: {}
      };

      var activeConnection = connections[connection.identity];

      // Create a new active connection
      new Connection(connection, function(err, conn) {
        if(err) return cb(err);

        // Store the live connection
        activeConnection.connection = conn;

        // Create a new database with the active connection
        activeConnection.database = new Database(conn);

        // Register each collection with the database
        Object.keys(collections).forEach(function(key) {
          activeConnection.database.configure(key, collections[key].definition);
        });

        // Sync the database with redis
        activeConnection.database.sync(cb);
      });
    },

    /**
     * Teardown
     *
     * Closes the connection and removes the connection object from the registry.
     *
     * @param {String} connectionName
     * @param {Function} callback
     */

    teardown: function(connectionName, cb) {
      if (typeof connectionName === 'function') {
        cb = connectionName;
        connectionName = null;
      }
      if (connectionName == null) {
        connections = {};
        return cb();
      }

      if(!connections[connectionName]) return cb();

      // Drain the connection pool if available
      connections[connectionName].connection.connection.quit();

      // Remove the connection from the registry
      delete connections[connectionName];

      cb();
    },

    /**
     * Describe a collection on `collection === tableName`
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Function} callback
     */

    describe: function(connectionName, collectionName, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.describe(collectionName, cb);
    },

    /**
     * Define a collection.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} definition
     * @param {Function} callback
     */

    define: function(connectionName, collectionName, definition, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.define(collectionName, definition, cb);
    },

    /**
     * Drop a collection on `collection === tableName`
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Array} relations
     * @param {Function} callback
     */

    drop: function(connectionName, collectionName, relations, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.drop(collectionName, relations, cb);
    },

    /**
     * Create a new record from `data`
     * - Ensure record unique keys are unique
     * - attempts to get meta data or creates them
     * - ensures the primary key is present and unique
     * - saves the data to database updating all unique index sets
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} data
     * @param {Function} callback
     */

    create: function(connectionName, collectionName, data, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.create(collectionName, data, cb);
    },

    /**
     * Join
     *
     * Peforms a join between 2-3 redis collections when Waterline core
     * needs to satisfy a `.populate()`.
     *
     * @param  {[type]}   connectionName [description]
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   criteria       [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    join: function (connectionName, collectionName, criteria, cb) {

      // Ignore `select` from waterline core
      if (typeof criteria === 'object') {
          delete criteria.select;
      }


      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      // Populate associated records for each parent result
      // (or do them all at once as an optimization, if possible)
      _runJoins({

        instructions: criteria,
        parentCollection: collectionName,

        /**
         * Find some records directly (using only this adapter)
         * from the specified collection.
         *
         * @param  {String}   collectionIdentity
         * @param  {Object}   criteria
         * @param  {Function} cb
         */
        $find: function (collectionIdentity, criteria, cb) {
          var connectionObject = connections[connectionName];
          return connectionObject.database.find(collectionIdentity, criteria, cb);
        },

        /**
         * Look up the name of the primary key field
         * for the collection with the specified identity.
         *
         * @param  {String}   collectionIdentity
         * @return {String}
         */
        $getPK: function (collectionIdentity) {
          if (!collectionIdentity) return;
          var connectionObject = connections[connectionName];
          return connectionObject.database.schema._primary[collectionIdentity.toLowerCase()];
        }
      }, cb);

    },

    /**
     * Find records based on criteria in `criteria`
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Function} callback invoked with `err, records`
     */

    find: function(connectionName, collectionName, criteria, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.find(collectionName, criteria, cb);
    },

    /**
     * Update records based on criteria
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Object} values
     * @param {Function} callback invoked with `err, records`
     */

    update: function(connectionName, collectionName, criteria, values, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.update(collectionName, criteria, values, cb);
    },

    /**
     * Destroy records based on criteria
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Function} callback invoked with `err`
     */

    destroy: function(connectionName, collectionName, criteria, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.destroy(collectionName, criteria, cb);
    },

    /**
     * Return the native redis object.
     *
     * @param {Function} callback invoked with `err, connection`
     */

    native: function(connectionName, collectionName, cb) {
      var connectionObject = connections[connectionName];
      var connection = connectionObject.database.connection;
      return cb(null, connection);
    }
  };

  return adapter;
})();
