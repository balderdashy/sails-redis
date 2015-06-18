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
 *
 * @param {Object} connection
 */

var Database = module.exports = function(connection) {

  // Hold the connection
  connection = connection || { connection: {} };

  this.connection = connection.connection;

  this.definedCollections = {};

  // Hold Schema for the database
  this.schema = new Schema(connection);

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

Database.prototype.configure = function configure(collectionName, schema) {
  var name = collectionName.toLowerCase();
  this.schema.registerCollection(name, schema);
};


/**
 * Sync the "database" to redis
 *
 * @param {Function} callback
 * @api public
 */

Database.prototype.sync = function sync(cb) {
  this.schema.sync(cb);
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
  if(Object.keys(desc).length === 0) desc = null;

  // Hack needed for migrate: safe
  if(!this.definedCollections[collectionName]) desc = null;

  cb(null, desc);
};

/**
 * Define the schema for a collection.
 *
 * @param {String} collectionName
 * @param {Object} definition
 * @param {Function} callback
 * @api public
 */

Database.prototype.define = function define(collectionName, definition, cb) {
  var name = collectionName.toLowerCase();
  this.schema.registerCollection(name, definition);

  // Hack needed for migrate: safe to return nothing when described
  this.definedCollections[collectionName] = true;

  cb();
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

  var self = this,
      name = collectionName.toLowerCase();

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

  this.connection.smembers(index, function(err, values) {
    if(err) return cb(err);

    // Add the member keys onto the keys array
    keys = keys.concat(values);

    async.each(keys, function(key, next) {
      self.connection.del(key, next);
    }, function(err) {
      if(err) return cb(err);

      self.schema._schema[collectionName] = {};

      cb();
    });
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

  // If the primary key is contained in the criteria and it is not an object/array), a NoSQL key can be
  // constructed and we can simply grab the values. This would be a findOne.
  // if the if statement is true then it can simply grab the record, but if it has more values than that then
  // it should do some more criteria solving, mainly for join's without unique id's and such
  if ( 
    criteria.where && criteria.where.hasOwnProperty(primary) && 
    !Array.isArray(criteria.where[primary]) &&
     Utils.present(criteria.where[primary]) && 
     Utils.count( criteria.where ) == 1
  ) {
      recordKey = this.schema.recordKey(name, primary, criteria.where[primary]);
      this.connection.get(recordKey, function(err, record) {
        if(err) return cb(err);
        if(!record) return cb(null, []);

        try {
          record = JSON.parse(record);
        } catch (e) {
          return cb(e);
        }

        cb(null, [self.schema.parse(name, record)]);
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
      self.connection.smembers(indexKey, function(err, members) {
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

        self.connection.get(member, function(err, result) {
          if(err) return done(err);

          if(!result) {
              return done();
          }

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
          var resultSet;
          try {
            resultSet = WaterlineCriteria(name, data, criteria);
          } catch (err) {
            return done(err);
          }

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
        resultSet = WaterlineCriteria(name, data, options).results || [];
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
      _data = _.cloneDeep(data),
      name = collectionName.toLowerCase(),
      sequences = self.schema._sequences[name],
      primary = self.schema._primary[name];


  name = Utils.replaceSpaces(name);

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
        return next(Errors.adapter.PrimaryKeyMissing);
      }

      next();
    },

    // Increment Sequences
    incrementSequences: ['checkUniqueConstraints', 'checkPrimaryKeyExists', function(next) {

        var sequenceValues = {};

        function incrementSequence(item, nextItem) {

          // If a value was set for a sequence, increase the sequence value
          // to match the set value
          if(data[item.name]) {
            item.set(data[item.name], function(err, value) {
              if(err) return nextItem(err);
              sequenceValues[item.name] = value;
              nextItem();
            });

            return;
          }

          // If not, increment by one
          item.increment(function(err, value) {
            if(err) return nextItem(err);
            sequenceValues[item.name] = value;
            nextItem();
          });
        }

        async.each(sequences, incrementSequence, function(err) {
          if(err) return next(err);
          next(null, sequenceValues);
        });
      }
    ],

    // Update Data values with auto-incrementing values
    setSequenceValue: ['incrementSequences', function(next, results) {
      var sequenceValues = results.incrementSequences;

      sequences.forEach(function(sequence) {
        if(data[sequence.name]) return;
        data[sequence.name] = parseInt(sequenceValues[sequence.name], 10);
      });

      next();
    }],

    // Save Key Data
    saveKeyData: ['setSequenceValue', function(next, results) {
      // Grab the key to use for this record
      var noSqlKey = self.schema.recordKey(name, primary, data[primary]);
      

      noSqlKey = Utils.sanitize(noSqlKey);

      // Stringify data for storage
      var parsedData;
      try {
        parsedData = JSON.stringify(data);
      } catch(e) {
        return next(e);
      }

      self.connection.set(noSqlKey, parsedData, function(err) {
        if(err) return next(err);

        // Find the newly created record and return it
        self.connection.get(noSqlKey, function(err, values) {
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

    // Add Auto-Generated Primary Key to indices
    addPKIndex: ['saveKeyData', function(next, results) {

      // Check if the primary key is a sequence
      var primary = self.schema._primary[name];

      // Store autoPK flag
      var autoPK = false;

      sequences.forEach(function(sequence) {
        if(sequence.name === primary) autoPK = true;
      });

      // If the primary key is not a sequence there is no need to index it.
      // It would have been previously indexed in the unique constraint test
      if(!autoPK) return next();

      // If a value was supplied for an autoPK value, it will be indexed by the
      // unique constraint test.
      if(_data[primary]) return next();

      var indices = self.schema._indices[name];

      // Index the new primary key value
      function indexPK(idx, nextItem) {
        if(idx.name !== primary) return nextItem();
        idx.index(Utils.sanitize(data[primary]), nextItem);
      }

      async.each(indices, indexPK, next);
    }],

    // Add Primary Key to indexed set
    addToSet: ['saveKeyData', function(next, results) {

      var index = self.schema.indexKey(name, primary);

      // Grab the key to use for this record
      var noSqlKey = self.schema.recordKey(name, primary, data[primary]);

      self.connection.sadd(index, noSqlKey, function(err) {
        if(err) return next(err);
        next();
      });

    }]

  }, function(err, results) {
    if(err) return cb(err);
    cb(null, results.saveKeyData);
  });

};

/**
 * Update a record
 *
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Object} values
 * @param {Function} callback
 * @api public
 */

Database.prototype.update = function update(collectionName, criteria, values, cb) {
  var self = this,
      name = collectionName.toLowerCase(),
      primary = self.schema._primary[name];


  // Don't allow the updating of primary keys
  if(Utils.present(values[primary]) && values[primary] !== criteria.where[primary]) {
    return cb(Errors.adapter.PrimaryKeyUpdate);
  }

  // Delete any primary keys
  delete values[primary];

  async.auto({

    // Find all matching records based on the criteria
    findRecords: function(next) {

      // Use the FIND method to get all the records that match the criteria
      self.find(name, criteria, function(err, records) {
        if(err) return next(err);
        next(null, records);
      });
    },

    // Check each Record to update meets the unique constraint rules
    checkUniqueConstraints: ['findRecords', function(next, results) {

      // Get Indices
      var indices = self.schema._indices[name];
      var indiceNames = indices.map(function(idx) { return idx.name; });

      // Check if any unique values are being updated across multiple records
      indiceNames.forEach(function(idx) {
        if(hasOwnProperty(values, idx) && results.findRecords.length > 1) {
          return next(new Error('Attempting to update a unique value on multiple records'));
        }
      });

      self._uniqueConstraint(name, values, function(err) {
        if(err) return next(err);
        next();
      });
    }],

    // Check that any sequences are not being updated
    checkPrimaryKeyValid: ['findRecords', function(next, results) {

      var sequences = self.schema._sequences[name];
      var sequenceNames = sequences.map(function(sequence) { return sequence.name; });

      var valid = true;
      sequences.forEach(function(sequenceNames) {
        if(Utils.present(values[sequenceNames])) {
          valid = false;
        }
      });

      if(!valid) {
        return next(Errors.adapter.InvalidAutoIncrement);
      }

      next();
    }],

    // Update any indexed values that have been created
    updateIndexes: ['checkUniqueConstraints', 'checkPrimaryKeyValid', function(next, results) {

      // Cache original values
      var data = results.findRecords;

      // Get Indices
      var indices = self.schema._indices[name];

      // Use a MULTI wrapper to ensure the removal and creation of indexes happens atomically
      var multi = self.connection.multi();

      // Queue up index operations
      function updateIndex(idx, nextItem) {

        var name = idx.name;
        var key = idx.keyName;

        // Indexed value not updated
        if(!Utils.present(values[name])) return nextItem();

        // Remove the previously indexed values
        data.forEach(function(record) {
          multi.srem(key, record[name]);
        });

        // Add the new indexed value
        multi.sadd(key, values[name]);

        nextItem();
      }

      async.each(indices, updateIndex, function(err) {
        if(err) return next(err);

        // Execute the MULTI set
        multi.exec(function(err, multiResults) {
          if(err) return next(err);
          if(multiResults.indexOf(0) > -1) return next(new Error('Error writing index'));

          next();
        });
      });
    }],

    // Update the record values
    updateRecords: ['updateIndexes', function(next, results) {
      var models = [];

      function updateRecord(item, nextItem) {
        var key = self.schema.recordKey(name, primary, item[primary]);
        var updatedValues = _.extend(item, values);

        self.connection.set(key, JSON.stringify(updatedValues), function(err) {
          if(err) return nextItem(err);
          models.push(updatedValues);
          nextItem();
        });
      }

      async.each(results.findRecords, updateRecord, function(err) {
        if(err) return next(err);
        next(null, models);
      });
    }]

  }, function(err, results) {
    if(err) return cb(err);
    cb(null, results.updateRecords);
  });
};

/**
 * Destory Record(s)
 *
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */

Database.prototype.destroy = function destroy(collectionName, criteria, cb) {
  var self = this,
      name = collectionName.toLowerCase(),
      primary = self.schema._primary[name];

  async.auto({

    // Find all matching records based on the criteria
    findRecords: function(next) {

      // Use the FIND method to get all the records that match the criteria
      self.find(name, criteria, function(err, records) {
        if(err) return next(err);
        next(null, records);
      });
    },

    // Destroy any indexed values
    destroyIndexes: ['findRecords', function(next, results) {

      // Cache original values
      var data = results.findRecords;

      // Get Indices
      var indices = self.schema._indices[name];
      var indexKey = self.schema.indexKey(name, primary);

      // Use a MULTI wrapper to ensure the removal indexes happens atomically
      var multi = self.connection.multi();

      // Queue up index operations, removes any unique index values
      function destroyIndex(idx, nextItem) {
        var name = idx.name;
        var key = idx.keyName;

        data.forEach(function(record) {
          multi.srem(key, record[name]);
        });

        nextItem();
      }

      // Queue up the removal of the primary key index removals
      data.forEach(function(item) {
        var recordKey = self.schema.recordKey(name, primary, item[primary]);
        multi.srem(indexKey, Utils.sanitize(recordKey));
      });

      async.each(indices, destroyIndex, function(err) {
        if(err) return next(err);

        // Execute the MULTI set
        multi.exec(function(err, multiResults) {
          if(err) return next(err);
          next();
        });
      });
    }],

    // Destory the actual keys for matching records
    destroyRecords: ['destroyIndexes', function(next, results) {

      var data = results.findRecords;

      function destroyRecord(item, nextItem) {
        var key = self.schema.recordKey(name, primary, item[primary]);
        self.connection.del(key, nextItem);
      }

      async.each(data, destroyRecord, function(err) {
        if(err) return next(err);
        next();
      });
    }]

  }, function(err, results) {
    if(err) return cb(err);
    cb(null, results.findRecords);
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

  // Grab the indices for this collection
  var indices = this.schema._indices[collectionName];

  // If there are no indices for this collection, return true
  if(indices.length === 0) return cb(null, true);

  // Create a MULTI wrapper for this connection
  var multi = this.connection.multi();

  // For each sequence, add an query to check if the index exists
  indices.forEach(function(idx) {

    // If no value is set, ignore it
    if(!hasOwnProperty(data, idx.name)) return;
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
    if(!unique) return cb(Errors.adapter.NotUnique);

    // If everything was unique, create each of the indexes
    async.each(indices, function(idx, next) {

      // If no value is set, ignore it
      if(!hasOwnProperty(data, idx.name)) return next();
      idx.index(data[idx.name], next);

    }, function(err) {
      if(err) return cb(err);
      cb();
    });
  });
};
