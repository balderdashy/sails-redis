
/**
 * Process Aggregates
 *
 * @param {Object} options
 * @param {Array} results
 * @return {Object}
 * @api public
 */

var Aggregate = module.exports = function(options, results) {

  // Check if there is a grouping
  if(!options.groupBy && !options.sum && !options.average && !options.min && !options.max) {
    return { results: results };
  }

  if(!options.sum && !options.average && !options.min && !options.max) {
    return { error: new Error('Cannot groupBy without a calculation') };
  }

  this.groupedResults = [];
  this.finishedResults = [];

  // Group Results and set defaults
  if(options.groupBy) {
    this.group(options.groupBy, results);
  } else {
    this.groupedResults.push(results);
    this.finishedResults.push({});
  }

  if(options.sum) this.sum(options.sum);
  if(options.average) this.average(options.average);
  if(options.min) this.min(options.min);
  if(options.max) this.max(options.max);

  return { results: this.finishedResults };
};

/**
 * Group Results
 *
 * @param {Object} groupBy
 * @param {Array} results
 * @api private
 */

Aggregate.prototype.group = function(groupBy, results) {
  var self = this,
      groups = [],
      groupCollector = {};

  // Go through the results
  results.forEach(function(item) {
    var key = '';

    groupBy.forEach(function(groupKey) {
      key += item[groupKey] + '---';
    });

    if(groupCollector[key]) return groupCollector[key].push(item);
    groupCollector[key] = [item];
  });

  for(var key in groupCollector) {
    groups.push(groupCollector[key]);
  }

  this.groupedResults = groups;

  // Then we generate stub objects for adding/averaging
  groups.forEach(function(group){
    var stubResult = {};

    // Groupresult will look like this: { type: 'count', a2: 'test' }
    groupBy.forEach(function(groupKey) {

      // Set the grouped by value to the value of the first results
      stubResult[groupKey] = group[0][groupKey];
    });

    self.finishedResults.push(stubResult);
  });
};

/**
 * Sum Results
 *
 * @param {Array} sum
 * @api private
 */

Aggregate.prototype.sum = function(sum) {
  var self = this;

  // fill in our stub object with those keys, set to sum 0
  sum.forEach(function(sumKey) {
    self.finishedResults.forEach(function(stub) {
      stub[sumKey] = 0;
    });
  });

  // iterate over all groups of data
  this.groupedResults.forEach(function(group, i) {

    // sum for each item
    group.forEach(function(item) {
      sum.forEach(function(sumKey) {
        if(typeof item[sumKey] === 'number') {
          self.finishedResults[i][sumKey]+=item[sumKey];
        }
      });
    });
  });
};

/**
 * Average Results
 *
 * @param {Array} average
 * @api private
 */

Aggregate.prototype.average = function(average) {
  var self = this;

  // fill in our stub object with those keys, set to sum 0
  average.forEach(function(sumKey) {
    self.finishedResults.forEach(function(stub) {
      stub[sumKey] = 0;
    });
  });

  // iterate over all groups of data
  this.groupedResults.forEach(function(group, i) {
    average.forEach(function(sumKey) {

      // count up how many numbers we have, so we know how much to divide by
      var cnt = 0;

      // average for each item
      group.forEach(function(item) {
        if(typeof item[sumKey] === 'number') {
          self.finishedResults[i][sumKey] += item[sumKey];
          cnt += 1;
        }
      });

      self.finishedResults[i][sumKey] /= cnt;
    });
  });
};

/**
 * Min Results
 *
 * @param {Array} min
 * @api private
 */

Aggregate.prototype.min = function(min) {
  var self = this;

  // iterate over all groups of data
  this.groupedResults.forEach(function(group, i) {
    min.forEach(function(sumKey) {

      // keep track of current minimum
      var min = Infinity;

      // update min
      group.forEach(function(item) {
        if(typeof item[sumKey] === 'number') {
          if(item[sumKey] < min) min = item[sumKey];
        }
      });

      self.finishedResults[i][sumKey] = isFinite(min) ? min : null;
    });
  });
};

/**
 * Max Results
 *
 * @param {Array} max
 * @api private
 */

Aggregate.prototype.max = function(max) {
  var self = this;

  // iterate over all groups of data
  self.groupedResults.forEach(function(group, i) {
    max.forEach(function(sumKey) {

      // keep track of current maximum
      var max = -Infinity;

      // update max
      group.forEach(function(item) {
        if(typeof item[sumKey] === 'number') {
          if(item[sumKey] > max) max = item[sumKey];
        }
      });

      self.finishedResults[i][sumKey] = isFinite(max) ? max : null;
    });
  });
};
