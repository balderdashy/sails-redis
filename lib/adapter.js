/**
 * Adapter dependencies
 */

var async = require('async'),
    utils = require('./utils'),
    extend = utils.extend,
    present = utils.present,
    Schema = require('./schema'),
    Transaction = require('./transaction'),
    errors = require('waterline-errors'),
    adapterErrors = errors.adapter;

/**
 * Expose adapter
 */

module.exports = {
  identity: "waterline-redis",
  schema: false,
  syncable: false,

  // New schema object,
  _schema: new Schema(),

  // New transaction object
  _transaction: new Transaction(),

  /**
   * Default adapter configuration
   */

  defaults: {
    port: 6379,
    host: 'localhost',
    password: null,
    options: {
      parser: 'hiredis',
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

  registerCollection: function(collection, callback) {
    var config = utils.serializeConfig(extend(
      this.defaults,
      collection.config));

    // Configure transaction object
    this._transaction.configure(config);
    this._transaction.registerSchema(this._schema);

    // Register with schema
    this._schema.register(collection.identity, collection.definition);

    return callback();
  },

  /**
   * Describe a collection on `collection === tableName`
   *
   * @param {String} collection
   * @param {Function} callback
   */

  describe: function(collection, callback) {
    var desc = this._schema.retrieve(collection);

    if(!desc) return callback(adapterErrors.collectionNotRegistered);
    return callback(null, desc);
  },

  /**
   * Drop a collection on `collection === tableName`
   *
   * @param {String} collection
   * @param {Function} callback
   */

  drop: function(collection, callback) {
    var redis,
        schema = this._schema,
        transaction = this._transaction,
        indexes = schema.unique(collection),
        primary = schema.primary(collection),
        index = transaction.indexKey(collection, primary);

    // Expand index keys
    var keys = indexes.concat(primary, '_meta').map(function(key) {
      return transaction.indexKey(collection, key);
    });

    transaction.exec(callback, function(done) {
      redis = this;

      redis.smembers(index, function(err, members) {
        if(err) return callback(err);
        if(members) keys = keys.concat(members);

        async.parallel(keys.map(deleteFn), function(err) {
          if(err) return done(err);
          done();
        });
      });
    });

    function deleteFn(key) {
      return function(callback) {
        redis.del(key, callback);
      };
    }
  },

  /**
   * Create a new record from `data`
   * - Ensure record unique keys are unique
   * - attempts to get meta data or creates them
   * - ensures the primary key is present and unique
   * - saves the data to database updating all unique index sets
   *
   * @param {String} collection
   * @param {Object} data
   * @param {Function} callback
   */

  create: function(collection, data, callback) {
    var redis,
        schema = this._schema,
        transaction = this._transaction,
        primary = schema.primary(collection),
        index = transaction.indexKey(collection, primary);

    transaction.exec(callback, function(done) {
      redis = this;

      transaction.isUnique(redis, collection, data, function(err, unique) {
        if(err) return done(err);
        if(!unique) return done(adapterErrors.notUnique);

        return create(done);
      });
    });

    // Start creation of record, adding auto increment keys
    function create(callback) {
      transaction.setIncrements(redis, collection, data, function(err, data) {
        if(err) return callback(err);
        var key = transaction.recordKey(collection, primary, data[primary]);

        redis.sismember(index, transaction.sanitize(key), function(err, status) {
          if(err) return callback(err);
          if(status) return callback(adapterErrors.primaryKeyCollision);

          commit(key, data, callback);
        });
      });
    }

    // Create record transaction
    function commit(key, data, callback) {
      var fns = schema.unique(collection);

      // Push primary key
      fns.push(primary);
      fns = fns.map(updateSets);

      // Expand unique keys array
      function updateSets(unique) {
        var index = transaction.indexKey(collection, unique),
            record = transaction.recordKey(collection, unique, data[unique]);

        return function(callback) {
          redis.sadd(index, transaction.sanitize(record), function(err) {
            if(err) return callback(err);
            callback();
          });
        };
      }

      function save(callback) {
        redis.set(key, JSON.stringify(data), function(err) {
          if(err) return callback(err);
          callback();
        });
      }

      // Set all unique keys and save record
      async.parallel(fns.concat([save]), function(err) {
        if(err) return callback(err);
        callback(null, data);
      });
    }
  },

  /**
   * Find records based on criteria in `criteria`
   *
   * @param {String} collection
   * @param {Object} criteria
   * @param {Function} callback invoked with `err, records`
   */

  find: function(collection, criteria, callback) {
    var schema = this._schema,
        transaction = this._transaction,
        primary = schema.primary(collection);

    // Primary key passed in criteria
    if(present(criteria[primary])) {
      transaction.exec(callback, function(done) {
        var redis = this,
            recordKey = transaction.recordKey(collection, primary, criteria);

        redis.get(recordKey, function(err, record) {
          if(err) return done(err);
          if(!record) return done(adapterErrors.notFound);
          return done(err, schema.parse(collection, record));
        });
      });

      return;
    }

    transaction.exec(callback, function(done) {
      var recordKey,
          models = [],
          redis = this,
          match = utils.matchFn(criteria),
          index = transaction.indexKey(collection, primary);

      redis.smembers(index, function(err, members) {
        if(err) return done(err);

        async.each(members, search, function(err) {
          if(err) return done(err);

          models = utils.sort(criteria.sort, primary, models);
          done(null, present(criteria.skip) ? models.slice(criteria.skip) : models);
        });
      });

      function search(member, done) {
        redis.get(member, function(err, result) {
          if(err) return done(err);

          result = schema.parse(collection, result);
          if(match(result)) models.push(result);
          done();
        });
      }
    });
  },

  /**
   * Update records based on criteria
   *
   * @param {String} collection
   * @param {Object} criteria
   * @param {Object} values
   * @param {Function} callback invoked with `err, records`
   */

  update: function(collection, criteria, values, callback) {
    var redis, models = [],
        schema = this._schema,
        transaction = this._transaction,
        primary = schema.primary(collection),
        unique = schema.unique(collection),
        indexes = unique.concat(primary),
        increments = schema.increments(collection);

    // Don't allow the updating of primary keys
    if(present(values[primary]) && values[primary] !== criteria[primary]) {
      return callback(adapterErrors.primaryKeyUpdate);
    }

    // Primary key passed for deletion
    if(present(criteria[primary])) {
      transaction.exec(callback, function(done) {
        var key;

        redis = this;
        key = transaction.recordKey(collection, primary, criteria[primary]);

        redis.get(key, function(err, data) {
          if(err) return done(err);
          update(key, schema.parse(collection, data), done);
        });
      });

      return;
    }

    transaction.exec(callback, function(done) {
      var match, index;

      redis = this;
      match = utils.matchFn(criteria);
      index = transaction.indexKey(collection, primary);

      redis.smembers(index, function(err, members) {
        if(err) return done(err);
        if(!members) return done();

        async.each(members, search(match), function(err) {
          if(err) done(err);
          done(null, utils.sort(criteria.sort, primary, models));
        });
      });
    });

    // If the record matchs, update it
    function search(match) {
      return function(record, callback) {
        redis.get(record, function(err, data) {
          if(err) return callback(err);

          data = schema.parse(collection, data);
          if(!match(data)) return callback();

          update(record, data, function(err, model) {
            if(err) return callback(err);
            models.push(model);
            callback();
          });
        });
      };
    }

    // Update the record and indexes belonging to it
    function update(key, data, callback) {
      // Update an index associated with `data`
      function updateIndexes(key, callback) {
        var index = transaction.indexKey(collection, key),
            record = transaction.recordKey(collection, key, data[key]);

        // Indexed value not updated
        if(!present(values[key])) return callback();

        // Remove old indexed value and add new one
        redis.srem(index, transaction.sanitize(record), function(err) {
          if(err) return callback(err);

          record = transaction.recordKey(collection, key, values[key]);
          redis.sadd(index, transaction.sanitize(record), callback);
        });
      }

      async.each(indexes, updateIndexes, function(err) {
        var i, len, newValues = extend(data, values);

        if(err) return callback(err);

        // Validate that increments have not changed
        for(i = 0, len = increments.length; i < len; i = i + 1) {
          if(data[increments[i]] !== newValues[increments[i]]) {
            return callback(adapterErrors.invalidAutoIncrement);
          }
        }

        redis.set(key, JSON.stringify(newValues), function(err) {
          if(err) return callback(err);
          callback(null, newValues);
        });
      });
    }
  },

  /**
   * Destroy records based on criteria
   *
   * @param {String} collection
   * @param {Object} criteria
   * @param {Function} callback invoked with `err`
   */

  destroy: function(collection, criteria, callback) {
    var redis,
        schema = this._schema,
        transaction = this._transaction,
        primary = schema.primary(collection),
        unique = schema.unique(collection),
        indexes = unique.concat(primary);

    // Primary key passed for deletion
    if(present(criteria[primary])) {
      transaction.exec(callback, function(done) {
        var key;

        redis = this;
        key = transaction.recordKey(collection, primary, criteria[primary]);

        redis.get(key, function(err, data) {
          if(err) return done(err);
          destroy(key, data, schema.parse(collection, data));
          done(null, true);
        });
      });

      return;
    }

    transaction.exec(callback, function(done) {
      var match, index;

      redis = this;
      match = utils.matchFn(criteria);
      index = transaction.indexKey(collection, primary);

      redis.smembers(index, function(err, members) {
        if(err) return done(err);
        if(!members) return done();

        async.each(members, search(match), function(err) {
          if(err) done(err);
          done(null, true);
        });
      });
    });

    // If the record matchs, destroy it
    function search(match) {
      return function(record, callback) {
        redis.get(record, function(err, data) {
          if(err) return callback(err);

          data = schema.parse(collection, data);
          if(!match(data)) return callback();
          destroy(record, data, callback);
        });
      };
    }

    // Destroy the record and indexes it belongs to
    function destroy(key, data, callback) {
      // Destroy an index associated with `data`
      function destroyIndex(key, callback) {
        var index = transaction.indexKey(collection, key),
            record = transaction.recordKey(collection, key, data[key]);

        redis.srem(index, transaction.sanitize(record), callback);
      }

      async.each(indexes, destroyIndex, function(err) {
        if(err) return callback(err);
        redis.del(key, callback);
      });
    }
  },

  /**
   * Return the native redis object, user is responsible for
   * closing the redis connection later down the callback chain.
   *
   * @param {Function} callback invoked with `err, connection`
   */

  native: function(callback) {
    this.transaction.connect(callback);
  }
};