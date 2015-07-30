/**
 * Create by sdiemert on 2015-06-26
 *
 * Unit tests for: lib/reports/DemographicsReport.js.
 */

var assert     = require('assert');
var demoReport = require('../../lib/reports/DemographicsReport.js');

describe("DemographicsReport", function () {

    beforeEach(function (done) {

        done();

    });

    afterEach(function (done) {

        done();

    });

    describe("#getDeltas()", function () {

        var proc   = null;
        var report = null;

        beforeEach(function (done) {

            proc   = {};
            report = demoReport.DemographicsReport("someName", "someName", null, proc);

            done();

        });

        afterEach(function (done) {

            done();

        });

        it("should return null if input a is null", function (done) {

            var r = proc.getDeltas(null, {});

            assert.equal(r, null);

            done();

        });

        it("should return null if input b is null", function (done) {

            var r = proc.getDeltas({}, null);

            assert.equal(r, null);

            done();

        });

        it("should return null if both inputs are null", function (done) {

            var r = proc.getDeltas(null, null);

            assert.equal(r, null);

            done();

        });

        it("should return null if inputs are empty arrays", function (done) {

            var r = proc.getDeltas({}, {});

            assert.equal(r, null);

            done();

        });

        it("should return null if object have no fields in common", function (done) {


            var a = {someField1: {}, someField2: {}};
            var b = {someOtherField1: {}, someOtherField2: {}};

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        });

        it("should return null if outer fields do not match", function (done) {


            var a = {someField1: {a: 1}, someField2: {b: 1}};
            var b = {someOtherField1: {a: 1}, someOtherField2: {b: 1}};

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        });

        it("should return null if outer fields match but inner fields do not.", function (done) {

            var a = {a: {a: 1}, b: {b: 1}};
            var b = {a: {c: 1}, b: {d: 1}};

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        });

        it("should return object if fields match", function (done) {

            var a        = {a: {a: 1}, b: {b: 1}};
            var b        = {a: {a: 1}, b: {b: 1}};
            var expected = {a: {a: 0}, b: {b: 0}};

            var r = proc.getDeltas(a, b);

            assert.deepEqual(r, expected);

            done();

        });

        it("should exclude fields that do not match but keep those that do", function (done) {

            var a        = {a: {a: 1}, b: {b: 1}, c: {c: 1}};
            var b        = {a: {a: 1}, b: {b: 1}, d: {d: 1}};
            var expected = {a: {a: 0}, b: {b: 0}};

            var r = proc.getDeltas(a, b);

            assert.deepEqual(r, expected);

            done();

        });

        it("should compute b - a for all fields", function (done) {

            var a        = {a: {a: 1, b: 2}};
            var b        = {a: {a: 2, b: 1}};
            var expected = {a: {a: 1, b: -1}};

            var r = proc.getDeltas(a, b);

            assert.deepEqual(r, expected);

            done();

        });

        it("should not fail if one field is not an object", function (done) {

            var a        = {a: {a: 1}, time: 100};
            var b        = {a: {a: 1}, time: 100};
            var expected = {a: {a: 0}};

            var r = proc.getDeltas(a, b);

            assert.deepEqual(r, expected);

            done();

        });

        it("should work on more real data", function (done) {


            var a = {
                "female"          : {
                    "0-9"  : 2,
                    "10-19": 2,
                    "20-29": 2,
                    "30-39": 2,
                    "40-49": 2,
                    "50-59": 2,
                    "60-69": 2,
                    "70-79": 2,
                    "80-89": 2,
                    "90+"  : 2
                },
                "male"            : {
                    "0-9"  : 2,
                    "10-19": 2,
                    "20-29": 2,
                    "30-39": 2,
                    "40-49": 2,
                    "50-59": 2,
                    "60-69": 2,
                    "70-79": 2,
                    "80-89": 2,
                    "90+"  : 2
                },
                "undifferentiated": {
                    "0-9"  : 2,
                    "10-19": 2,
                    "20-29": 2,
                    "30-39": 2,
                    "40-49": 2,
                    "50-59": 2,
                    "60-69": 2,
                    "70-79": 2,
                    "80-89": 2,
                    "90+"  : 2
                },
                "undefined"       : {
                    "0-9"  : 2,
                    "10-19": 2,
                    "20-29": 2,
                    "30-39": 2,
                    "40-49": 2,
                    "50-59": 2,
                    "60-69": 2,
                    "70-79": 2,
                    "80-89": 2,
                    "90+"  : 2
                }
            };

            var b = {
                "female"          : {
                    "0-9"  : 1,
                    "10-19": 1,
                    "20-29": 1,
                    "30-39": 1,
                    "40-49": 1,
                    "50-59": 1,
                    "60-69": 1,
                    "70-79": 1,
                    "80-89": 1,
                    "90+"  : 1
                },
                "male"            : {
                    "0-9"  : 1,
                    "10-19": 1,
                    "20-29": 1,
                    "30-39": 1,
                    "40-49": 1,
                    "50-59": 1,
                    "60-69": 1,
                    "70-79": 1,
                    "80-89": 1,
                    "90+"  : 1
                },
                "undifferentiated": {
                    "0-9"  : 1,
                    "10-19": 1,
                    "20-29": 1,
                    "30-39": 1,
                    "40-49": 1,
                    "50-59": 1,
                    "60-69": 1,
                    "70-79": 1,
                    "80-89": 1,
                    "90+"  : 1
                },
                "undefined"       : {
                    "0-9"  : 1,
                    "10-19": 1,
                    "20-29": 1,
                    "30-39": 1,
                    "40-49": 1,
                    "50-59": 1,
                    "60-69": 1,
                    "70-79": 1,
                    "80-89": 1,
                    "90+"  : 1
                }
            };

            var e = {
                "female"          : {
                    "0-9"  : 1,
                    "10-19": 1,
                    "20-29": 1,
                    "30-39": 1,
                    "40-49": 1,
                    "50-59": 1,
                    "60-69": 1,
                    "70-79": 1,
                    "80-89": 1,
                    "90+"  : 1
                },
                "male"            : {
                    "0-9"  : 1,
                    "10-19": 1,
                    "20-29": 1,
                    "30-39": 1,
                    "40-49": 1,
                    "50-59": 1,
                    "60-69": 1,
                    "70-79": 1,
                    "80-89": 1,
                    "90+"  : 1
                },
                "undifferentiated": {
                    "0-9"  : 1,
                    "10-19": 1,
                    "20-29": 1,
                    "30-39": 1,
                    "40-49": 1,
                    "50-59": 1,
                    "60-69": 1,
                    "70-79": 1,
                    "80-89": 1,
                    "90+"  : 1
                },
                "undefined"       : {
                    "0-9"  : 1,
                    "10-19": 1,
                    "20-29": 1,
                    "30-39": 1,
                    "40-49": 1,
                    "50-59": 1,
                    "60-69": 1,
                    "70-79": 1,
                    "80-89": 1,
                    "90+"  : 1
                }
            };

            var r = proc.getDeltas(b, a);

            assert.deepEqual(r, e);

            done();

        });

    });

});