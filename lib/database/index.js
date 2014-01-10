/**
 * Module Dependencies
 */

var _ = require('lodash'),
    async = require('async'),
    Errors = require('waterline-errors'),
    Utils = require('../utils'),
    Schema = require('./schema');

/**
 * An Interface for interacting with Redis.
 */

var Database = module.exports = function() {

  // Hold Schema for the database
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

Database.prototype.configure = function configure(collectionName, config, schema, cb) {
  var name = collectionName.toLowerCase();

  if(this.schema._schema[name]) return cb();

  this.schema.registerCollection(name, schema, config, cb);

};

/**
 * Describe the schema for a collection.
 *
 * @param {String} collectionName
 * @param {Function} callback
 * @api public
 */

Database.prototype.describe = function describe(collectionName, cb) {
  var name = collectionName.toLowerCase(),
      desc = this.schema.retrieve(name);

  if(!desc) return cb(Errors.adapter.collectionNotRegistered);
  cb(null, desc);
};

/**
 * Create a new record from `data`
 *
 * @param {String} collectionName
 * @param {Object} data
 * @param {Function} callback
 * @api public
 */

Database.prototype.create = function create(collectionName, data, cb) {
  var self = this,
      name = collectionName.toLowerCase(),
      sequences = self.schema._sequences[name],
      primary = self.schema._primary[name];

  async.auto({

    // Check Unique constraints
    checkUniqueConstraints: function(next) {
      self._uniqueConstraint(name, data, function(err) {
        if(err) return next(err);
        next();
      });
    },

    // Check that the primary key exists or is auto-incrementing
    checkPrimaryKeyExists: function(next) {

      var sequenceNames = sequences.map(function(sequence) { return sequence.name; });

      if(!Utils.present(data[primary]) && !~sequenceNames.indexOf(primary)) {
        return next(Errors.adapter.primaryKeyMissing);
      }

      next();
    },

    // Check that if the primary key is auto-incrementing the user didn't supply a value
    checkPrimaryKeyValid: function(next) {

      var sequenceNames = sequences.map(function(sequence) { return sequence.name; });

      for(i = 0, len = sequences.length; i < len; i = i + 1) {
        if(Utils.present(data[sequenceNames[i]])) {
          return next(Errors.adapter.invalidAutoIncrement);
        }
      }

      next();
    },

    // Increment Sequences
    incrementSequences: [
      'checkUniqueConstraints', 'checkPrimaryKeyExists', 'checkPrimaryKeyValid',
      function(next) {

        function incrementSequence(item, nextItem) {
          item.increment(nextItem);
        }

        async.each(sequences, incrementSequence, next);
      }
    ],

    // Update Data values with auto-incrementing values
    setSequenceValue: ['incrementSequences', function(next) {

      function setSequenceValue(sequence, nextItem) {
        sequence.get(function(err, value) {
          if(err) return nextItem(err);

          data[sequence.name] = parseInt(value, 10);
          nextItem();
        });
      }

      async.each(sequences, setSequenceValue, function(err) {
        if(err) return next(err);
        next();
      });

    }],

    // Save Key Data
    saveKeyData: ['setSequenceValue', function(next, results) {

      // Grab the key to use for this record
      var noSqlKey = self.schema.recordKey(name, primary, data[primary]);
      noSqlKey = Utils.sanitize(noSqlKey);

      // Grab the raw connection for this collection
      var connection = self.schema._connections[collectionName];

      // Stringify data for storage
      var parsedData;
      try {
        parsedData = JSON.stringify(data);
      } catch(e) {
        return next(e);
      }

      connection.client.set(noSqlKey, parsedData, function(err) {

        // Find the newly created record and return it
        connection.client.get(noSqlKey, function(err, values) {
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

    // Add Primary Key to indexed set
    addToSet: ['saveKeyData', function(next, results) {

      var index = self.schema.indexKey(name, primary);

      // Grab the key to use for this record
      var noSqlKey = self.schema.recordKey(name, primary, data[primary]);

      // Grab the raw connection for this collection
      var connection = self.schema._connections[collectionName];

      connection.client.sadd(index, noSqlKey, function(err) {
        if(err) return next(err);
        next();
      });

    }]

  }, function(err, results) {
    if(err) return cb(err);
    cb(null, results.saveKeyData);
  });

};


///////////////////////////////////////////////////////////////////////////////////////////
/// CONSTRAINTS
///////////////////////////////////////////////////////////////////////////////////////////


/**
 * Check to ensure the data is unique to the schema.
 *
 * @param {String} collectionName
 * @param {Object} data
 * @param {Function} callback
 */

Database.prototype._uniqueConstraint = function _uniqueConstraint(collectionName, data, cb) {

  // Grab the raw connection for this collection
  var connection = this.schema._connections[collectionName];

  // Grab the indices for this collection
  var indices = this.schema._indices[collectionName];

  // If there are no indices for this collection, return true
  if(indices.length === 0) return cb(null, true);

  // Create a MULTI wrapper for this connection
  var multi = connection.client.multi();

  // For each sequence, add an query to check if the index exists
  indices.forEach(function(idx) {
    multi.sismember(idx.keyName, data[idx.name]);
  });

  // Run the MULTI wrapped transaction checking that the results are all falsy
  multi.exec(function(err, results) {
    if(err) return cb(err);

    var unique = true;
    results = results || [];

    // For each of the results, if any are truthy then the value is not unique
    results.forEach(function(res) {
      if(res) unique = false;
    });

    // If unique is false return an error
    if(!unique) return cb(Errors.adapter.notUnique);

    // If everything was unique, create each of the indexes
    async.each(indices, function(idx, next) {
      idx.index(data[idx.name], next);
    }, function(err) {
      if(err) return cb(err);
      cb();
    });
  });
};
