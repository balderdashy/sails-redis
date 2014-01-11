/**
 * Run Integration Tests
 *
 * Uses the waterline-adapter-tests module to
 * run mocha tests against the currently implemented
 * waterline API.
 */

var tests = require('waterline-adapter-tests'),
    adapter = require('../../lib/adapter'),
    mocha = require('mocha');

/**
 * Build a Config File
 */

var config = {
  schema: false
};

/**
 * Run Tests using the default redis config
 */

var suite = new tests({ adapter: adapter, config: config });
