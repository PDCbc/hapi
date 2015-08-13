/**
 * Create by sdiemert on 15-08-14
 *
 * Unit tests for: MedClassResultManager.
 */

var assert                = require('assert');
var MedClassResultManager = require('../../lib/resultManager/MedClassResultManager').MedClassResultManager;

describe("MedClassResultManager", function () {


    var proc = null;
    var mcrm = null;

    beforeEach(function (done) {

        proc = {};
        mcrm = MedClassResultManager("cpsid", {}, proc);

        done();

    });

    afterEach(function (done) {

        proc = null;
        mcrm = null;

        done();

    });

    describe("#applyPrivacyFilter()", function () {


        beforeEach(function (done) {

            done();

        });

        afterEach(function (done) {

            done();

        });

        it("should return null if the input is undefined", function (done) {

            var r = proc.applyPrivacyFilter();
            assert.equal(r, null);

            done();

        });

        it("should return null if the input is null", function (done) {

            var r = proc.applyPrivacyFilter(null);
            assert.equal(r, null);

            done();

        });

        it("should return null if the input is non-Array", function (done) {

            var r = proc.applyPrivacyFilter("NOT AN ARRAY TYPE");
            assert.equal(r, null);

            done();

        });

        it("should call the parent class privacyFilter() with valid input", function (done) {

            proc.privacyFilter = function (x) {
                assert.equal(x, 5);
                done();
            };

            var input = [{class: 'foo', count: 5}];

            var r = proc.applyPrivacyFilter(input);

        });

        it("should call return null if the input is malformed", function (done) {

            var input = [{class: "FOO"}]; //no count field
            var r = proc.applyPrivacyFilter(input);
            assert.equal(r, null);
            done();

        });

        it("should catch errors thrown from functions it calls", function (done) {

            proc.privacyFilter = function (x) {
                throw new Error("some error");
            };

            var input = [{class: "FOO", count: 5}]; //no count field

            var r = null;
            assert.doesNotThrow(function () {

                r = proc.applyPrivacyFilter(input);

            }, Error);

            assert.equal(r, null);
            done();

        });

        it("should apply privacy filter and remove counts < 5", function () {

            var input = [
                {class: "FOO", count: 0},
                {class: "FOO", count: 4},
                {class: "FOO", count: 5},
                {class: "FOO", count: 6}
            ];

            var output = proc.applyPrivacyFilter(input);

            assert.equal(output[0].count, 0);
            assert.equal(output[1].count, 0);
            assert.equal(output[2].count, 5);
            assert.equal(output[3].count, 6);


        });

    });

});