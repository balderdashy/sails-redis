/**
 * Test dependencies
 */

var assert = require('assert'),
    Adapter = require('../../'),
    Support = require('../support')(Adapter);

/**
 * Raw waterline-redis `.find()` tests
 */

describe('adapter `.find()`', function() {
  before(function(done) {
    var definition = {
      id: {
        type: 'integer',
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: 'string'
      },
      age: {
        type: 'integer'
      }
    };

    Support.Setup('finders', definition, function(err) {
      Adapter.create('finders', { name: 'Steve Holt', age: 19 }, function(err) {
        if(err) throw err;
        Adapter.create('finders', { name: 'Annyong', age: 18 }, done);
      });
    });
  });

  after(function(done) {
    Support.Teardown('finders', done);
  });

  describe('simple', function() {
    it("should find using string `name`", function(done) {
      var criteria = { where: { name: 'Steve Holt' } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].name === 'Steve Holt');
        done();
      });
    });

    it("should find using integer `age`", function(done) {
      var criteria = { where: { age: 18 } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].age === 18);
        done();
      });
    });

    it("should return all records with empty criteria", function(done) {
      Adapter.find('finders', {}, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 2);
        done();
      });
    });
  });

  describe("complex", function() {
    it("should properly return records using `startsWith`", function(done) {
      var criteria = { where: { name: { startsWith: 'Anny' } } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].name === 'Annyong');
        done();
      });
    });

    it("should properly return records using `endsWith`", function(done) {
      var criteria = { where: { name: { endsWith: 'Holt' } } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].name === 'Steve Holt');
        done();
      });
    });

    it("should properly return records using `like`", function(done) {
      var criteria = { where: { like: { name: '%eve%' } } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].name === 'Steve Holt');

        done();
      });
    });

    it("should properly return records using `contains`", function(done) {
      var criteria = { where: { name: { contains: 'nny' } } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].name === 'Annyong');
        done();
      });
    });

    it("should properly return records using `in` type query", function(done) {
      var criteria = { where: { name: ['Steve Holt', 'Annyong'] } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 2);
        assert(records[0].name === 'Steve Holt');
        assert(records[1].name === 'Annyong');
        done();
      });
    });

    it("should properly return records using `lessThan`", function(done) {
      var criteria = { where: { age: { lessThan: 19 } } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].name === 'Annyong');
        done();
      });
    });

    it("should properly return records using `lessThanOrEqual`", function(done) {
      var criteria = { where: { age: { lessThanOrEqual: 19 } } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 2);
        assert(records[0].name === 'Steve Holt');
        assert(records[1].name === 'Annyong');
        done();
      });
    });

    it("should properly return records using `greaterThan`", function(done) {
      var criteria = { where: { age: { greaterThan: 18 } } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].name === 'Steve Holt');
        done();
      });
    });

    it("should properly return records using `greaterThanOrEqual`", function(done) {
      var criteria = { where: { age: { greaterThanOrEqual: 18 } } };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 2);
        assert(records[0].name === 'Steve Holt');
        assert(records[1].name === 'Annyong');
        done();
      });
    });
  });

  describe('additional functionality', function() {
    it("should properly return records using `limit`", function(done) {
      var criteria = { where: { age: [18, 19] }, limit: 1 };

      Adapter.find('finders', criteria, function(err, records) {
        if(err) throw err;

        assert(records);
        assert(records.length === 1);
        assert(records[0].name === 'Steve Holt');
        done();
      });
    });
  });

});
