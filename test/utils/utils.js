/**
 * Test dependencies
 */

var assert = require('assert'),
    Adapter = require('../../'),
    Utils = require('../../lib/utils'),
    Support = require('../support')(Adapter),
    Errors = require('waterline-errors').adapter;

/**
 * Raw adapter specific tests
 */

describe('Utility `.replaceSpaces()`', function() {
  describe('replace spaces', function() {
      it('should replace spaces with a _ ', function(done) {
        assert.equal( Utils.replaceSpaces("My string with spaces"), "My_string_with_spaces" );
        done();
      });
  });
});
