/**
 * Module Dependencies
 */

var _ = require('lodash'),
    async = require('async'),
    Errors = require('waterline-errors'),
    WaterlineCriteria = require('waterline-criteria'),
    Utils = require('../utils'),
    Schema = require('./schema'),
    Aggregate = require('../aggregates'),
    hasOwnProperty = Utils.object.hasOwnProperty;

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
 * Drop a collection and all of it's keys.
 *
 * @param {String} collectionName
 * @param {Array} relations
 * @param {Function} callback
 * @api public
 */

Database.prototype.drop = function drop(collectionName, relations, cb) {

  var name = collectionName.toLowerCase();

  // Grab the raw connection for this collection
  var connection = this.schema._connections[name];

  // Cache key values
  var primary = this.schema._primary[name];
  var index = this.schema.indexKey(name, primary);

  // Build an array to hold the collections keys
  var keys = [];

  // Expand Sequence Keys
  this.schema._sequences[name].forEach(function(sequence) {
    keys.push(sequence.keyName);
  });

  // Expand Indices
  this.schema._indices[name].forEach(function(idx) {
    keys.push(idx.keyName);
  });

  // Add the main primary key index to the keys array
  keys.push(index);

  connection.smembers(index, function(err, values) {
    if(err) return cb(err);

    // Add the member keys onto the keys array
    keys = keys.concat(values);

    async.each(keys, function(key, next) {
      connection.del(key, next);
    }, cb);
  });

};

/**
 * Find a record or set of records based on a criteria object.
 *
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */

Database.prototype.find = function find(collectionName, criteria, cb) {
  var self = this,
      name = collectionName.toLowerCase(),
      options = {},
      recordKey;

  // Find the attribute used as a primary key
  var primary = this.schema._primary[name];

  // Find the index key used to keep track of all the keys in this collections
  var indexKey = this.schema.indexKey(name, primary);

  // Grab the raw connection for this collection
  var connection = this.schema._connections[name];

  // If the primary key is contained in the criteria, a NoSQL key can be
  // constructed and we can simply grab the values. This would be a findOne.
  if(Utils.present(criteria[primary])) {
    recordKey = this.schema.recordKey(name, primary, criteria[primary]);

    connection.get(recordKey, function(err, record) {
      if(err) return cb(err);
      if(!record) return cb(Errors.adapter.notFound);

      try {
        record = JSON.parse(record);
      } catch (e) {
        return cb(e);
      }

      cb(null, self.schema.parse(name, record));
    });

    return;
  }

  async.auto({

    // Cache any SKIP, LIMIT, SORT criteria params
    // these will be used later after any criteria matches are found
    cleanseCriteria: function(next) {

      if(hasOwnProperty(criteria, 'skip')) {
        options.skip = _.cloneDeep(criteria.skip);
        delete criteria.skip;
      }

      if(hasOwnProperty(criteria, 'limit')) {
        options.limit = _.cloneDeep(criteria.limit);
        delete criteria.limit;
      }

      if(hasOwnProperty(criteria, 'sort')) {
        options.sort = _.cloneDeep(criteria.sort);
        delete criteria.sort;
      } else {
        // Sort by primaryKey asc
        options.sort = {};
        options.sort[primary] = 1;
      }

      next();
    },

    // Get all the record keys belonging to this collection
    getSetMembers: function(next) {
      connection.smembers(indexKey, function(err, members) {
        if(err) return next(err);
        next(null, members);
      });
    },

    // Filter the records to only include those that match the criteria,
    // using Waterline-Criteria for the actual matching logic.
    filterKeys: ['cleanseCriteria', 'getSetMembers', function(next, results) {
      var members = results.getSetMembers,
          models = [];

      // If no members were found, the result set will always be empty
      if(members.length === 0) return next();

      function search(member, done) {
        connection.get(member, function(err, result) {
          if(err) return done(err);

          try {
            result = JSON.parse(result);
          } catch (e) {
            return done(e);
          }

          // Cast Result Data
          result = self.schema.parse(name, result);

          // Build up a dataset for use with waterline-criteria
          var data = {};
          data[name] = [result];

          // Check for match using waterline-criteria
          var resultSet = WaterlineCriteria(name, data, criteria);
          models = models.concat(resultSet.results);

          done();
        });
      }

      // For each member grab the values and run a filter on it.
      // Not the most effecient way to query but redis has no query language.
      async.each(members, search, function(err) {
        if(err) return next(err);
        next(null, models);
      });
    }],

    // Process Models
    // Runs any sorting, skipping, limits, etc and processes any Aggregate options.
    processModels: ['filterKeys', function(next, results) {
      var resultSet = results.filterKeys;

      // If any processing options were supplied, re-run Waterline-Criteria with the filtered
      // results set. This will process any sorting and pagination options.
      if(hasOwnProperty(options, 'sort') || hasOwnProperty(options, 'limit') || hasOwnProperty(options, 'skip')) {

        // Build up a dataset for use with waterline-criteria
        var data = {};
        data[name] = resultSet;

        options.where = {};
        resultSet = WaterlineCriteria(name, data, options).results;
      }

      // Process Aggregate Options
      var aggregate = new Aggregate(criteria, resultSet);

      if(aggregate.error) return next(aggregate.error);
      next(null, aggregate.results);
    }]

  }, function(err, results) {
    if(err) return cb(err);
    cb(null, results.processModels);
  });
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

      connection.set(noSqlKey, parsedData, function(err) {

        // Find the newly created record and return it
        connection.get(noSqlKey, function(err, values) {
          if(err) return next(err);

          // Parse JSON into an object
          try {
            values = JSON.parse(values);
          } catch(e) {
            return next(e);
          }

          next(null, self.schema.parse(name, values));
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

      connection.sadd(index, noSqlKey, function(err) {
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
  var multi = connection.multi();

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
