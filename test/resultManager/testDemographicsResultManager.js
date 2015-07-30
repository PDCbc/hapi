var assert                    = require("assert");
var DemographicsResultManager = require('../../lib/resultManager/DemographicsResultManager.js').DemographicsResultManager;
var logger = require('../../lib/logger.js').Logger("testDemographicsResultManager", 1);

var rm         = null;
var proc       = null;
var testData   = null;
var testGroups = null;

describe('DemographicsResultManager', function () {

    beforeEach(function (done) {

        proc = {};

        testGroups = [

            {
                name   : 'test1',
                members: ['cpsid', 'cpsid2']
            }, {
                name   : 'test2',
                members: ['cpsid4']
            }

        ];

        testData = require('../fixtures/demographics_test_data.js');

        rm = DemographicsResultManager("cpsid", testData.inputData.executions[0], proc);

        proc.groups.setData(testGroups);

        done();

    });

    afterEach(function (done) {

        proc.regexString               = null;
        proc.createDataObjectFromSplit = null;
        proc.groups                    = null;
        proc                           = null;
        rm                             = null;
        testData = null;

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

    describe("#generateResult()", function () {

        beforeEach(function (done) {

            done();

        });

        afterEach(function (done) {

            done();

        });


        it("should return a result on normal input", function (done) {

            var r = proc.generateResult();

            assert.deepEqual(r.processed_result.clinician[0], require('../fixtures/demographics_test_data.js').expectedOutput.processed_result.clinician[0]);
            assert.deepEqual(r.processed_result.group[0], require('../fixtures/demographics_test_data.js').expectedOutput.processed_result.group[0]);
            assert.deepEqual(r.processed_result.network[0], require('../fixtures/demographics_test_data.js').expectedOutput.processed_result.network[0]);

            done();

        });

        it("should return null if there is no time field in the input data.", function (done) {

            delete proc.data.time;

            var r = proc.generateResult();

            assert.equal(r, null);

            done();

        });

    });

    describe("#combineByGender()", function () {

        it("should return null for null input type", function (done) {

            var r = proc.combineByGender(null);

            assert.equal(r, null);

            done();

        });

        it("should return null for non-array input type", function (done) {

            var r = proc.combineByGender({notAnArray: 1});

            assert.equal(r, null);

            done();

        });

        it("should return null for an array of length 0", function (done) {

            var r = proc.combineByGender([]);

            assert.equal(r, null);

            done();

        });

        it("should return null if the input contains only invalid gender types", function (done) {

            var d = [{gender: "NoAValidGenderType", lowerAge: 0, upperAge: 1, count: 1}];

            proc.supportedGenders   = [];
            proc.supportedAgeRanges = ['0-1'];

            var r = proc.combineByGender(d);

            assert.equal(r, null);

            done();

        });

        it("should return lowerAge+ if upperAge is null", function (done) {

            proc.supportedGenders = ["someGender"];
            proc.supportedAgeRanges = ['10+'];

            var d = [{gender: "someGender", lowerAge: 10, upperAge: null, count: 1}];

            var r = proc.combineByGender(d);

            assert.deepEqual(r, {"someGender": {"10+": 1}});

            done();

        });

        it("should return only gender types in proc.supportedGenders", function (done) {

            proc.supportedGenders = ["someGender"];
            proc.supportedAgeRanges = ['0-1'];

            var d = [
                {gender: "someGender", lowerAge: 0, upperAge: 1, count: 1},
                {gender: "someOtherGender", lowerAge: 0, upperAge: 1, count: 1}
            ];

            var r = proc.combineByGender(d);

            assert.deepEqual(r, {"someGender": {"0-1": 1}});

            done();

        });

        it("should combined multiple values of the same age range and gender", function (done) {

            proc.supportedGenders = ["someGender"];
            proc.supportedAgeRanges = ['0-1'];

            var d = [
                {gender: "someGender", lowerAge: 0, upperAge: 1, count: 1},
                {gender: "someGender", lowerAge: 0, upperAge: 1, count: 1}
            ];

            var r = proc.combineByGender(d);

            assert.deepEqual(r, {"someGender": {"0-1": 2}});

            done();

        });

        it("should combine different age ranges under the same gender", function (done) {

            proc.supportedGenders = ["someGender"];
            proc.supportedAgeRanges = ['0-1', '2-3'];

            var d = [
                {gender: "someGender", lowerAge: 0, upperAge: 1, count: 1},
                {gender: "someGender", lowerAge: 2, upperAge: 3, count: 1}
            ];

            var r = proc.combineByGender(d);

            assert.deepEqual(r, {"someGender": {"0-1": 1, "2-3": 1}});

            done();

        });

        it("should combine different age ranges and genders correctly", function (done) {

            proc.supportedGenders = ["someGender", "anotherGender"];
            proc.supportedAgeRanges = ['0-1', '2-3'];

            var d = [
                {gender: "someGender", lowerAge: 0, upperAge: 1, count: 1},
                {gender: "someGender", lowerAge: 2, upperAge: 3, count: 1},
                {gender: "anotherGender", lowerAge: 0, upperAge: 1, count: 1},
                {gender: "anotherGender", lowerAge: 2, upperAge: 3, count: 1}
            ];

            var expected = {

                "someGender"   : {
                    "0-1": 1,
                    "2-3": 1
                },
                "anotherGender": {
                    "0-1": 1,
                    "2-3": 1
                }

            };

            var r = proc.combineByGender(d);

            assert.deepEqual(r, expected);

            done();

        });

    });

});
