/**
 * Utility dependencies
 */

var redis = require('redis');

/**
 * Expose adapter utility functions
 */

var utils = module.exports = exports;

/**
 * Ignore
 */

utils.object = {};

/**
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 * @return {Boolean}
 * @api public
 */

var hop = Object.prototype.hasOwnProperty;
utils.object.hasOwnProperty = function(obj, prop) {
  return hop.call(obj, prop);
};

/**
 * Serialize the configuration object
 *
 * @param {Object} collection
 * @return {Object}
 */

utils.serializeConfig = function serializeConfig(config) {
  return {
    port: config.port,
    host: config.host,
    options: config.options,
    password: config.password
  };
};

/**
 * Sanitize a key removing any spaces or reserved charaters
 *
 * @param {String} str
 */

utils.sanitize = function sanitize(str) {
  return typeof str === 'string' ? str.replace(/\s+/g, '_') : str;
};

/**
 * Sanitize a key by removing spaces or reserved charaters
 *
 * @param {String} str
 */

utils.replaceSpaces  = function replaceSpaces(str) {
  return typeof str === 'string' ? str.replace(/\s/g, '_') : str;
};

/**
* A simple object key count method
* 
* @param {object} object
* @return {int} How many keys are there
*/
utils.count = function count(object){
  var count = 0;
  for ( var key in object) count++;
  return count;
}

/**
 * Check if `property` is not undefined and not null
 *
 * @param {Object|String|Number} property
 * @return {Boolean}
 */

utils.present = function present(property) {
  return typeof property !== 'undefined' && property !== null;
};

/**
 * Escape a string to be used as a `RegExp`
 *
 * @param {String} str
 */

utils.escapeString = function escapeString(str) {
  return str.replace(/[\{\}\[\]\(\)\*\+\?\-\.\^\$\|\\]/g, '\\$&');
};
