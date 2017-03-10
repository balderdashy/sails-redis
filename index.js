/**
 * Adapter dependencies
 */

var Driver = require('machinepack-redis');


// Keep track of all the active datastores registered by sails-redis.
// (Note: This statefulness will eventually be pulled into Waterline core.)
var _activeDatastores = {};


/**
 * Expose the adapter
 */

module.exports = {

  identity: 'sails-redis',

  adapterApiVersion: 1,

  syncable: false,

  schema: false,

  datastores: _activeDatastores,//<< exposed for access by sails-hook-orm

  defaults: {

    // Standard configuration:
    // - - - - - - - - - - - - - - - - - - - -
    url: 'redis://localhost:6379',
    onUnexpectedFailure: undefined,//< See https://github.com/treelinehq/machinepack-redis/blob/277f0fb796ea538d7ae281a0f8fa90f8b004bb45/machines/create-manager.js#L31-L44
    // - - - - - - - - - - - - - - - - - - - -

    // Miscellaneous options:
    // - - - - - - - - - - - - - - - - - - - -
    return_buffers: false,
    detect_buffers: false,
    socket_nodelay: true,
    no_ready_check: false,
    enable_offline_queue: true
    // - - - - - - - - - - - - - - - - - - - -
  },

  /**
   * Register datastore.
   *
   * Create a manager using the configuration provided, and track it,
   * along with the provided config (+a reference to the static driver)
   * as an active datastore.
   *
   * > We also send that back to Waterline.
   *
   * @param {Dictionary} datastoreConfig
   * @param {Dictionary} allKnownModelDefs
   * @param {Function} done
   */

  registerDatastore: function(datastoreConfig, allKnownModelDefs, done) {

    if(!datastoreConfig.identity) { return done(new Error('Datastore is missing an identity')); }
    if(_activeDatastores[datastoreConfig.identity]) { return done(new Error('Datastore (`'+datastoreConfig.identity+'`) has already been registered by sails-redis')); }

    // Create the manager.
    //
    // > See: https://github.com/treelinehq/machinepack-redis/blob/master/machines/create-manager.js
    Driver.createManager({
      connectionString: datastoreConfig.url,
      onUnexpectedFailure: datastoreConfig.onUnexpectedFailure,
      meta: datastoreConfig
    }).exec(function (err, report) {
      if (err) { return done(err); }

      // Track the now-active datastore.
      _activeDatastores[datastoreConfig.identity] = {
        config: datastoreConfig,
        manager: report.manager,
        driver: Driver
      };

      return done(undefined, _activeDatastores[datastoreConfig.identity]);

    });//</createManager>


  },

  /**
   * Unregister the specified datastore, so that is no longer considered active,
   * and its manager is destroyed (& thus all of its live db connections are released.)
   *
   * @param {String} datastoreName
   * @param {Function} done
   */

  teardown: function(datastoreName, done) {

    if (!_activeDatastores[datastoreName]) {
      return done();
    }

    // Destroy the manager.
    // (This drains the connection pool.)
    //
    // > See: https://github.com/treelinehq/machinepack-redis/blob/master/machines/destroy-manager.js
    Driver.destroyManager({ manager: _activeDatastores[datastoreName].manager }).exec(function (err) {
      if (err) { return done(err); }

      // Untrack this datastore in the registry.
      delete _activeDatastores[datastoreName];

      return done();

    });//</ Driver.destroyManager() >

  }

};
