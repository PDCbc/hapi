/**
 * Create by sdiemert on 2015-06-26
 *
 * Unit tests for: lib/queries.js.
 */

var assert  = require('assert');
var queries = require('../lib/queries.js');


var testData = {

    'PDC-001': queries.DEMOGRAPHICS,

    'PDC-055': queries.MEDCLASS,

    'PDC-053': queries.RATIO
};

describe("queries", function () {

    beforeEach(function (done) {

        queries.setQueries(testData);

        done();

    });

    afterEach(function (done) {

        done();

    });

    describe("#getQueryType()", function () {


        beforeEach(function (done) {

            done();

        });

        afterEach(function (done) {

            done();

        });

        it("should return null if input is null", function (done) {

            assert.equal(null, queries.getQueryType(null));

            done();

        });

        it("should return ratio if query is not in data", function (done) {

            assert.equal('ratio', queries.getQueryType('NOT_A_TITLE'));

            done();

        });

        it("should return RATIO for PDC-053", function (done) {

            assert.deepEqual(queries.getQueryType('PDC-053'), queries.RATIO);

            done();

        });


    });

});