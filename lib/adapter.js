/**
 * Adapter dependencies
 */

var async = require('async'),
    utils = require('./utils'),
    Schema = require('./schema'),
    Transaction = require('./transaction');

/**
 * Expose adapter
 */

module.exports = {
  identity: "waterline-redis",
  syncable: false,

  // New schema object,
  schema: new Schema(),

  // New transaction object
  transaction: new Transaction(this.schema),

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
    var config = utils.serializeConfig(utils.extend(
      this.defaults,
      collection.config));

    // Configure transaction object
    this.transaction.configure(config);
    this.transaction.registerSchema(this.schema);

    // Register with schema
    this.schema.register(collection.identity, collection.definition);

    return callback();
  },

  /**
   * Describe a collection on `name === tableName`
   *
   * @param {String} name
   * @param {Function} callback
   */

  describe: function(name, callback) {
    var desc = this.schema.retrieve(name);

    if(!desc) return callback(new Error('Unable to find collection ' + name));
    return callback(null, desc);
  },

  /**
   * Drop a collection on `name === tableName`
   *
   * @param {String} name
   * @param {Function} callback
   */

  drop: function(name, callback) {
    this.transaction.exec(callback, function(done) {
      this.connection.del(name);
      return done();
    });
  },

  /**
   * Create a record from `data`
   *
   * @param {String} collection
   * @param {Object} data
   * @param {Function} callback
   */

  create: function(collection, data, callback) {
    var schema = this.schema,
        transaction = this.transaction;

    transaction.exec(callback, function(done) {
      var key, results = [],
          self = this,
          redis = this.connection,
          pk = schema.primary(collection),
          idx = this.indexKey(collection, schema.primary(collection));

      // Normalize to array
      if(!Array.isArray(data)) data = [data];

      // Ensure data is unique
      async.parallel(data.map(unique), function(err, results) {
        if(err) return done(err);

        var status = results.reduce(function(a, b) {
          return a && b;
        }, true);

        if(!status) return done(new Error('Record not unique'));

        // Create record for every element in `data`
        async.each(data, createRecord, function(err) {
          if(err) return done(err);
          if(results.length === 1) return done(null, results[0]);
          return done(null, results);
        });
      });

      // Closure for `transaction.isUnique`
      function unique(data) {
        return function(callback) {
          transaction.isUnique(collection, data, callback);
        };
      }

      function createRecord(data, callback) {
        // Unsure primary key is unique if set
        if(typeof data[pk] !== 'undefined') {
          key = transaction.recordKey(collection, pk, data[pk]);

          redis.sismember(idx, key, function(err, status) {
            if(err) return done(err);
            if(status) return done(new Error('Record has already been created'));
            return commit(key, data, callback);
          });
        } else {
          // Sort the current set and get the next
          redis.sort(idx, 'ALPHA', function(err, results) {
            if(err) return done(err);

            if(!results || !results.length) {
              key = 1;
            } else {
              key = results.pop().split(':').pop();
              key = parseInt(key, 10) + 1;
            }

            data[pk] = key;
            return commit(transaction.recordKey(collection, pk, key), data, callback);
          });
        }
      }

      // Create record transaction
      function commit(key, data, callback) {
        var fns = schema.unique(collection);

        // Push primary key
        fns.push(pk);
        fns = fns.map(updateSets);

        // Expand unique keys array
        function updateSets(unique) {
          var index = transaction.indexKey(collection, unique),
              record = transaction.recordKey(collection, pk, data[unique]);

          return function(callback) {
            redis.sadd(index, transaction.sanitize(record), function(err) {
              if(err) return callback(err);
              return callback();
            });
          };
        }

        function save(callback) {
          var k = transaction.sanitize(key);

          redis.set(k, JSON.stringify(data), function(err) {
            if(err) return callback(err);
            callback();
          });
        }

        // Set all unique keys and save record
        async.parallel(fns.concat([save]), function(err) {
          if(err) return callback(err);

          results.push(data);
          return callback();
        });
      }
    });
  },

  /**
   * Find records based on criteria in `options`
   *
   * @param {String} collection
   * @param {Object} options
   * @param {Function} callback invoked with `err, records`
   */

  find: function(collection, options, callback) {
    var schema = this.schema,
        transaction = this.transaction;

    this.transaction.exec(callback, function(done) {
      var i, len,
          self = this,
          results = [],
          redis = this.connection,
          match = utils.matchFn(options),
          pk = this.indexKey(collection, schema.primary(collection));

      redis.smembers(pk, function(err, members) {
        if(err) return done(err);

        async.each(members, search, function(err) {
          if(err) return done(err);
          done(null, results);
        });
      });

      function search(member, done) {
        redis.get(member, function(err, result) {
          if(err) return done(err);

          result = JSON.parse(result);

          if(match(result)) results.push(match);
          done();
        });
      }
    });
  },

  /**
   * Update records based on criteria
   *
   * @param {String} collection
   * @param {Object} options
   * @param {Object} values
   * @param {Function} callback invoked with `err, records`
   */

  update: function(collection, options, values, callback) {
    this.transaction.exec(callback, function(done) {
      throw new Error('Not implemented');
      done();
    });
  },

  /**
   * Destroy records based on criteria
   *
   * @param {String} collection
   * @param {Object} options
   * @param {Function} callback invoked with `err`
   */

  destroy: function(collection, options, callback) {
    this.transaction.exec(callback, function(done) {
      throw new Error('Not implemented');
      done();
    });
  }
};