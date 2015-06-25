var assert = require("assert");
var fs     = require('fs');

var RetroRatioResultManager = require('../../lib/resultManager/RetroRatioResultManager.js').RetroRatioResultManager;
var fixedTestData           = require("../fixtures/retro_test_data.js").data;
var expectedTestResult      = require("../fixtures/retro_test_data.js").expected;

var proc       = null;
var rrm        = null;
var testData   = null;
var testGroups = null;

describe("RetroRatioResultManager", function () {

    beforeEach(function (done) {

        proc = {};

        testData = fixedTestData.executions;

        testGroups = [

            {
                name: 'test1',
                members: ['cpsid1', 'cpsid2', 'cpsid3', 'cpsid']
            }, {
                name: 'test2',
                members: ['cpsid4']
            }, {
                name: "test3",
                members: []
            }, {
                name: "test4",
                members: ['cpsid10'] //this combined with group test5 create a case where the
                                     //id cpsid10 is in the same group.
            }, {
                name: "test5",
                members: ['cpsid10', 'cpsid11']
            }

        ];


        rrm = RetroRatioResultManager('cpsid', testData, proc);

        proc.groups.setData(testGroups);

        done();

    });

    afterEach(function (done) {

        proc       = null;
        testData   = null;
        testGroups = null;
        rrm        = null;

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

    describe("#generateResult()", function () {

        it('test for a valid data to be returned', function (done) {

            var r = proc.generateResult(proc.data);

            assert.deepEqual(r, expectedTestResult);

            done();

        });

        it('test for empty result if undefined input is provided', function (done) {

            var r = proc.generateResult(null);

            assert.deepEqual(r.processed_result, {});
            assert.equal(r.provider_id, 'cpsid');

            done();


        });

    });

    describe("#getFormattedData()", function () {

        it('test for valid data to be returned', function (done) {

            rrm.getFormattedData(function (result) {

                assert.deepEqual(result, expectedTestResult);
                done();

            });

        });

    });

});