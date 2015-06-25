var assert = require("assert");

var RatioResultManager = require('../../lib/resultManager/RatioResultManager.js').RatioResultManager;

var proc     = null;
var rrm      = null;
var testData = null;

describe("RatioResultManager", function () {

    beforeEach(function (done) {

        proc = {};

        testData = {

            aggregate_result: {

                "denominator_cpsid": 5,
                "numerator_cpsid": 4,
                "denominator_cpsid1": 2,
                "numerator_cpsid1": 1,
                "numerator_cpsid4": 10,
                "denominator_cpsid4": 20,
                "numerator_cpsid11": 10,
                "denominator_cpsid11": 20

            }

        };

        rrm = RatioResultManager('cpsid', testData, proc);

        done();

    });

    afterEach(function (done) {

        proc     = null;
        testData = null;
        rrm      = null;

        done();

    });

    describe("#createDataObjectFromSplit()", function () {


        var rex = null;

        beforeEach(function (done) {

            rex = new RegExp(proc.regexString, 'gi');
            done();

        });

        afterEach(function (done) {

            rex = null;

            done();

        });

        it('should generate an object with field="denominator" and clinician="cpsid1"', function (done) {

            var s = "denominator_cpsid1";
            var r = proc.createDataObjectFromSplit(rex.exec(s));
            assert.equal('object', typeof r);
            assert.equal(r.field, 'denominator');
            assert.equal(r.clinician, 'cpsid1');
            done();

        });

        it('should return null since there are no matches provided', function (done) {

            var r = proc.createDataObjectFromSplit();
            assert.equal(null, r);
            done();

        });

        it('should return null since the string does not match the proc.regexString', function (done) {

            var s = "notDenominator_invalidCharSet_notAnId";
            var r = proc.createDataObjectFromSplit(rex.exec(s));
            assert.equal(r, null);
            done();

        });

    });


});