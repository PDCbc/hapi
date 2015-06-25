var assert                    = require("assert");
var DemographicsResultManager = require('../../lib/resultManager/DemographicsResultManager.js').DemographicsResultManager;

var rm       = null;
var testData = null;
var proc     = null;


describe('DemographicsResultManager', function () {

    beforeEach(function (done) {

        proc = {};

        rm = DemographicsResultManager("cpsid", testData, proc);

        done();

    });

    afterEach(function (done) {

        proc.regexString               = null;
        proc.createDataObjectFromSplit = null;
        proc.groups                    = null;
        proc                           = null;
        rm                             = null;

        done();

    });

    describe("#createDataObjectFromSplit()", function () {

        it("should return null from a string that is not of the correct format", function (done) {

            var s   = "NOT_A_MATCH_FOR_DEMOGRAPHICS_REGEX";
            var exp = new RegExp(proc.regexString, 'gi');

            var result = proc.createDataObjectFromSplit(exp.exec(s));

            assert.equal(result, null);

            done();

        });

        it("should return expected object for a string of correct format", function (done) {

            var s        = "female_0-9_clinician";
            var expected = {
                gender   : "female",
                lowerAge : 0,
                upperAge : 9,
                clinician: "clinician",
                original : s
            };
            var exp      = new RegExp(proc.regexString, 'gi');

            var result = proc.createDataObjectFromSplit(exp.exec(s));

            assert.deepEqual(result, expected);

            done();

        });

        it("should return expected object for a string with 90+ in it", function (done) {

            var s        = "female_90+_clinician";
            var expected = {
                gender   : "female",
                lowerAge : 90,
                upperAge : null,
                clinician: "clinician",
                original : s
            };
            var exp      = new RegExp(proc.regexString, 'gi');

            var result = proc.createDataObjectFromSplit(exp.exec(s));

            assert.deepEqual(result, expected);

            done();

        });

        it("should return expected object for a string with 90+ in it", function (done) {

            var s        = "female_90+_clinician";
            var expected = {
                gender   : "female",
                lowerAge : 90,
                upperAge : null,
                clinician: "clinician",
                original : s
            };
            var exp      = new RegExp(proc.regexString, 'gi');

            var result = proc.createDataObjectFromSplit(exp.exec(s));

            assert.deepEqual(result, expected);

            done();

        });

        it("should return expected object for a string male gender", function (done) {

            var s        = "male_0-9_clinician";
            var expected = {
                gender   : "male",
                lowerAge : 0,
                upperAge : 9,
                clinician: "clinician",
                original : s
            };
            var exp      = new RegExp(proc.regexString, 'gi');

            var result = proc.createDataObjectFromSplit(exp.exec(s));

            assert.deepEqual(result, expected);

            done();

        });

        it("should return expected object for a string undifferentiated gender", function (done) {

            var s        = "undifferentiated_0-9_clinician";
            var expected = {
                gender   : "undifferentiated",
                lowerAge : 0,
                upperAge : 9,
                clinician: "clinician",
                original : s
            };
            var exp      = new RegExp(proc.regexString, 'gi');

            var result = proc.createDataObjectFromSplit(exp.exec(s));

            assert.deepEqual(result, expected);

            done();

        });

        it("should return expected object for a string undefined gender", function (done) {

            var s        = "undefined_0-9_clinician";
            var expected = {
                gender   : "undefined",
                lowerAge : 0,
                upperAge : 9,
                clinician: "clinician",
                original : s
            };
            var exp      = new RegExp(proc.regexString, 'gi');

            var result = proc.createDataObjectFromSplit(exp.exec(s));

            assert.deepEqual(result, expected);

            done();

        });

        it("should return null for an unexpected gender type", function (done) {

            var s = "notSomeGenderType_0-9_clinician";

            var expected = null;

            var exp = new RegExp(proc.regexString, 'gi');

            var result = proc.createDataObjectFromSplit(exp.exec(s));

            assert.deepEqual(result, expected);

            done();

        });

        it("should return null for an input that is not an array", function (done) {

            assert.equal(proc.createDataObjectFromSplit({notAnArray: 1}), null);

            done();

        });

    });

});
