/**
 * Module dependencies
 */

var TestRunner = require('waterline-adapter-tests');
var packageMD = require('../package.json');
var RedisAdapter = require('../index.js');


// Log an intro message.
console.log('Testing `' + packageMD.name + '`, a Sails/Waterline adapter.');
console.log('Running `waterline-adapter-tests` against '+packageMD.waterlineAdapter.interfaces.length+' interface(s) and '+packageMD.waterlineAdapter.features.length+' feature(s)...');
console.log('|   Interfaces:   '+(packageMD.waterlineAdapter.interfaces.join(', ')||'n/a')+'');
console.log('|   Features:     '+(packageMD.waterlineAdapter.features.join(', ')||'n/a')+'');
console.log('Latest draft of Waterline adapter interface spec:');
console.log('https://github.com/balderdashy/sails-docs/blob/master/adapter-specification.md');


// Use the `waterline-adapter-tests` module to
// run mocha tests against the specified interfaces
// of the currently-implemented Waterline adapter API.
new TestRunner({

  // Load the adapter module.
  adapter: RedisAdapter,

  // Default adapter config to use.
  config: {
    database: 2,
    host: 'localhost'
  },

  // The set of adapter interface layers & specific features to test against.
  interfaces: packageMD.waterlineAdapter.interfaces,
  features: packageMD.waterlineAdapter.features,

});
