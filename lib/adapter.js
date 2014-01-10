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
  identity: 'waterline-redis',
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

  drop: function(collectionName, relations, cb) {
    database.drop(collectionName, relations, cb);
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

  update: function(collection, criteria, values, callback) {
    var redis, models = [],
        schema = _schema,
        transaction = _transaction,
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
        schema = _schema,
        transaction = _transaction,
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

  native: function(collectionName, cb) {
    var connection = database.schema._connections[collectionName];
    return cb(null, connection.client);
  }
};
})();
