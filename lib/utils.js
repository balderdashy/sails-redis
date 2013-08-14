/**
 * Utility dependencies
 */

var redis = require('redis');

/**
 * Expose adapter utility functions
 */

var utils = module.exports = exports;

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
 * Check if `property` is not undefined and not null
 *
 * @param {Object|String|Number} property
 * @return {Boolean}
 */

utils.present = function present(property) {
  return typeof property !== 'undefined' && property !== null;
};

/**
 * Create a new child object from `arguments`
 *  latter parents will overwrite previous
 *
 * @param {Object} parent...
 * @return {Object}
 */

utils.extend = function extend() {
  var i, len, child = {},
      p = Array.prototype.slice.call(arguments);

  for(i = 0, len = p.length; i < len; i = i + 1) {
    for(var k in p[i]) {
      if(Array.isArray(p[i][k])) {
        child[k] = Array.prototype.slice.call(p[i][k]);
      } else if(p[i][k] instanceof Date) {
        child[k] = p[i][k];
      } else if(typeof p[i][k] === 'object' && p[i][k] !== null) {
        child[k] = extend(p[i][k]);
      } else {
        child[k] = p[i][k];
      }
    }
  }

  return child;
};

/**
 * Escape a string to be used as a `RegExp`
 *
 * @param {String} str
 */

utils.escapeString = function escapeString(str) {
  return str.replace(/[\{\}\[\]\(\)\*\+\?\-\.\^\$\|\\]/g, '\\$&');
};

/**
 * Return a filter function satisfies criteria
 *
 * @param {Object} criteria
 * @return {Function}
 */

utils.matchFn = function matchFn(criteria) {
  var where = criteria.where,
      present = utils.present;

  return function match(record) {
    var matcher;

    // Ensure were are checking something
    if(!present(record)) return false;

    // Iterate over all keys in criteria.where
    for(var attr in where) {
      // Record cannot match if it doesn't have the proper attribute
      if(!present(record[attr])) return false;

      // Nested cases
      if(present(where[attr]) && typeof where[attr] === 'object') {
        // In type query
        if(Array.isArray(where[attr])) {
          if(!~where[attr].indexOf(record[attr])) return false;
        }

        // Inverted for proper setting of `match`
        if(present(where[attr].lessThan)) {
          if(record[attr] >= where[attr].lessThan) return false;
        }

        if(present(where[attr].lessThanOrEqual)) {
          if(record[attr] > where[attr].lessThanOrEqual) return false;
        }

        if(present(where[attr].greaterThan)) {
          if(record[attr] <= where[attr].greaterThan) return false;
        }

        if(present(where[attr].greaterThanOrEqual)) {
          if(record[attr] < where[attr].greaterThanOrEqual) return false;
        }

        if(present(where[attr].startsWith)) {
          matcher = new RegExp('^' + utils.escapeString(where[attr].startsWith), 'i');
          if(!matcher.test(record[attr])) return false;
        }

        if(present(where[attr].endsWith)) {
          matcher = new RegExp(utils.escapeString(where[attr].endsWith) + '$', 'i');
          if(!matcher.test(record[attr])) return false;
        }

        if(present(where[attr].contains)) {
          matcher = new RegExp(utils.escapeString(where[attr].contains), 'i');
          if(!matcher.test(record[attr])) return false;
        }

        if(present(where[attr].like)) {
          matcher = new RegExp(utils.escapeString(where[attr].like).replace(/%/g, '.*'), 'i');
          if(!matcher.test(record[attr])) return false;
        }
      } else if(typeof where[attr] === 'string') {
        // Case insensitive searchs
        // TODO: Change remove cast to string after cast normalization
        if(where[attr].toLowerCase() !== String(record[attr]).toLowerCase()) return false;
      } else {
        if(where[attr] !== record[attr]) return false;
      }
    }

    return true;
  };
};

/**
 * Sorting functionality for model arrays
 *
 * @param {Object} criteria
 * @param {Array} models
 */

utils.sort = function sort(criteria, primary, models) {
  var present = utils.present;

  // If no sort criteria sort by primary key
  if(!present(criteria)) {
    return models.sort(function(a, b) {
      if(a[primary] < b[primary]) return -1;
      if(a[primary] > b[primary]) return 1;
      return 0;
    });
  }

  return models.sort(function(a, b) {
    for(var attr in criteria) {
      if(a[attr] < b[attr]) return criteria[attr];
      return 0;
    }

    return 0;
  });
};