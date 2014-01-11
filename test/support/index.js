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
    adapter.registerCollection(this.Configure(name, def), callback);
  };

  /**
   * Teardown function
   *
   * @param {String} collection
   * @param {Function} callback
   */

  Support.Teardown = function(collection, callback) {
    adapter.drop(collection, callback);
  };

  return Support;
};
