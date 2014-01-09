/**
 * Module Dependencies
 */

var _ = require('lodash'),
    async = require('async'),
    Errors = require('waterline-errors'),
    Schema = require('./schema'),
    Connection = require('./connection'),
    Utils = require('./utils');


/**
 * An Interface for interacting with Redis.
 *
 */

var Database = module.exports = function() {

  // Hold Config for each collection
  this.config = {};

  // Hold Schema for each collection
  this.schema = new Schema();

  return this;
};


///////////////////////////////////////////////////////////////////////////////////////////
/// PUBLIC METHODS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Configure the "database" for a collection.
 *
 * @param {String} collectionName
 * @param {Object} config
 * @param {Object} schema
 * @param {Function} callback
 * @api public
 */

Database.prototype.configure = function(collectionName, config, schema, cb) {
  var name = collectionName.toLowerCase();

  if(!this.config[name]) this.config[name] = config;
  if(!this.schema._schema[name]) this.schema.register(name, schema);

  // Sync any indexes needed
  this._manageSequences(collectionName, function(err) {
    if(err) return cb(err);
    cb();
  });

};

/**
 * Describe the schema for a collection.
 *
 * @param {String} collectionName
 * @param {Function} callback
 * @api public
 */

Database.prototype.describe = function(collectionName, cb) {
  var name = collectionName.toLowerCase();
  var desc = this.schema.retrieve(name);

  if(!desc) return cb(Errors.adapter.collectionNotRegistered);
  cb(null, desc);
};

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

Database.prototype.create = function(collectionName, data, cb) {
  var self = this,
      name = collectionName.toLowerCase(),
      primary = self.schema.primary(collectionName),
      index;

  async.auto({

    // Get a connection object from the Connection module
    createConnection: function(next) {
      self._connection(name, function(err, connection) {
        if(err) return next(err);

        // Grab the index key
        index = connection.connection.indexKey(collectionName, primary);

        next(null, connection);
      });
    },

    // Check Unique constraints
    checkUniqueConstraints: ['createConnection', function(next, results) {
      self._uniqueConstraint(results.createConnection, name, data, function(err, unique) {
        if(err) return next(err);
        if(!unique) return next(Errors.adapter.notUnique);
        next();
      });
    }],

    // Increment Indexes by adding the operations to the multi queue
    incrementIndexes: ['checkUniqueConstraints', function(next, results) {

      // Get all the sequences used in this collection
      var sequences = self.schema.sequences(collectionName);

      // Check that the primary key exists or is an auto incrementing value
      if(!Utils.present(data[primary]) && !~sequences.indexOf(primary)) {
        return next(Errors.adapter.primaryKeyMissing);
      }

      // Check that an auto incrementing primary key wasn't supplied
      for(i = 0, len = sequences.length; i < len; i = i + 1) {
        if(Utils.present(data[sequences[i]])) {
          return next(Errors.adapter.invalidAutoIncrement);
        }
      }

      // Queue up increment operations for each key
      sequences.forEach(function(key) {
        self._autoIncrement(results.createConnection, name, key);
      });

      results.createConnection.multi.exec(function(err, results) {
        if(err) return next(err);
        next(null, results);
      });
    }],

    // Save Key Data
    saveKeyData: ['incrementIndexes', function(next, results) {

      // For each auto-incrementing sequence value, add it to the data object
      var sequences = self.schema.sequences(collectionName);

      sequences.forEach(function(key, i) {
        data[key] = results.incrementIndexes[i];
      });

      // Grab the key to use for this record
      var noSqlKey = results.createConnection.connection.recordKey(name, primary, data[primary]);

      // Grab the Unique Index Key
      var uniqueIndexKey = results.createConnection.connection.uniqueKey(collectionName);

      // Stringify data for storage
      var parsedData;
      try {
        parsedData = JSON.stringify(data);
      } catch(e) {
        return next(e);
      }

      var multi = results.createConnection.multi;

      // Attempt to write any unique indexes to their index set
      // Uses a multi to ensure all indexes write before trying to save the record.
      self.schema.unique(collectionName).forEach(function(idx) {
        if(!Utils.object.hasOwnProperty(data, idx)) return;
        multi.sadd(uniqueIndexKey + ':' + idx, data[idx]);
      });

      // Write Key
      multi.set(noSqlKey, parsedData);

      // Exec the transaction
      multi.exec(function(err, transResults) {
        if(err) return next(err);

        // Find the newly created record and return it
        results.createConnection.client.get(noSqlKey, function(err, values) {
          if(err) return next(err);

          // Parse JSON into an object
          try {
            values = JSON.parse(values);
          } catch(e) {
            return next(e);
          }

          next(null, values);
        });
      });
    }],

    // Add Primary Key to sorted set
    addToSet: ['saveKeyData', function(next, results) {

      // Grab the key to use for this record
      var noSqlKey = results.createConnection.connection.recordKey(name, primary, data[primary]);

      results.createConnection.client.sadd(index, noSqlKey, function(err) {
        if(err) return next(err);
        next();
      });

    }]

  }, function(err, results) {

    // Close the redis connection
    results.createConnection.client.quit();

    if(err) return cb(err);
    cb(null, results.saveKeyData);
  });

};


///////////////////////////////////////////////////////////////////////////////////////////
/// PRIVATE METHODS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Create a connection
 *
 */

Database.prototype._connection = function _connection(collectionName, cb) {
  var connection = new Connection();
  connection.configure(this.config[collectionName]);
  connection.connection(function(err, client) {
    if(err) return cb(err);
    cb(null, { connection: connection, client: client.client, multi: client.multi });
  });
};


/**
 * Ensure a value is set for each "sequence" aka auto-incrementing key.
 *
 * @param {String} collectionName
 * @param {Function} callback
 * @api private
 */

Database.prototype._manageSequences = function _manageSequences(collectionName, cb) {

  // Get all the sequences used in this collection
  var sequences = this.schema.sequences(collectionName);

  // Create a connection
  this._connection(collectionName, function(err, connection) {
    if(err) return cb(err);

    // Get the key used to denote sequences
    var sequenceKey = connection.connection.sequenceKey(collectionName);

    function createSequence(key, next) {
      var noSqlKey = sequenceKey + ':' + key;
      connection.client.get(noSqlKey, function(err, sequence) {
        if(err) return next(err);
        if(sequence) return next();

        connection.client.set(noSqlKey, 0, function(err) {
          if(err) return next(err);
          next();
        });
      });
    }

    // Ensure all the sequences are created
    async.each(sequences, createSequence, function(err) {
      connection.client.quit();
      if(err) return cb(err);
      cb();
    });
  });
};


///////////////////////////////////////////////////////////////////////////////////////////
/// CONSTRAINTS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Check to ensure the data is unique to the schema.
 *
 * @param {Object} connection
 * @param {String} collectionName
 * @param {Object} data
 * @param {Function} callback
 */

Database.prototype._uniqueConstraint = function(connection, collectionName, data, cb) {
  var self = this,
      unique = this.schema.unique(collectionName),
      uniqueIndexKey = connection.connection.uniqueKey(collectionName);

  // Ensure every key is unique
  async.every(unique, exists, function(unique) {
    cb(null, unique);
  });

  function exists(key, next) {

    // Don't worry about unique indexes on undefined keys
    if (typeof data[key] === 'undefined') return next(true);

    var index = uniqueIndexKey + ':' + key,
        value = Utils.sanitize(data[key]);

    connection.client.sismember(index, value, function(err, found) {
      if(err) return cb(err);
      cb(null, !found);
    });
  }
};

/**
 * Queue up any auto-incrementing keys to a transaction.
 *
 * @param {Object} connection
 * @param {String} collectionName
 * @param {String} key
 * @param {Function} callback
 */

Database.prototype._autoIncrement = function(connection, collectionName, key) {

  // Get the key used to denote sequences
  var sequenceKey = connection.connection.sequenceKey(collectionName);

  // Queue up increment operations for each key
  var noSqlKey = sequenceKey + ':' + key;
  connection.multi.incr(noSqlKey);
};
