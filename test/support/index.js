/**
 * Expose `Support`
 */

module.exports = function(adapter) {
  var Support = {};

  /**
   * Configure helper
   * - using default redis config
   *
   * @param {String} name
   * @param {Object} definition
   */

  Support.Configure = function(name, definition) {
    return {
      identity: name,
      definition: definition
    };
  };

  /**
   * Setup function
   *
   * @param {String} collection
   * @param {Object} def
   * @param {Function} callback
   */

  Support.Setup = function(name, def, callback) {
    var connection = {
      identity: 'test',
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
    };

    var collection = this.Configure(name, def);
    collection.definition.connection = 'test';

    var collections = {};
    collections[name] = collection;

    adapter.registerConnection(connection, collections, callback);
  };

  /**
   * Teardown function
   *
   * @param {String} collection
   * @param {Function} callback
   */

  Support.Teardown = function(collection, callback) {
    adapter.drop('test', collection, [], function(err) {
      adapter.teardown('test', callback);
    });
  };

  return Support;
};
