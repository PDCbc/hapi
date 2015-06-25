var assert = require('assert');

var TimedReport = require('../../lib/reports/TimedReport.js').TimedReport;

var tr = null;
var proc = null;

describe('TimedReport', function () {

    beforeEach(function (done) {

        proc = {};

        tr = TimedReport("shortName", "name", [], proc);

        done();

    });

    afterEach(function (done) {

        proc = null;
        tr   = null;

        done();

    });

    describe("#generateCSVReport()", function () {


        it('should thrown an error if called', function (done) {

            assert.throws(proc.generateCSVReport);

            done();
        });

    });

    describe('#getDeltas()', function () {

        it("tests normal case where all fields are the same", function (done) {

            var a = {aggregate_result: {field1: 1, field2: 2}};
            var b = {aggregate_result: {field1: 2, field2: 3}};

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1, 1);
            assert.equal(r.delta.field2, 1);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        });

        it("tests normal case where some fields are 0", function (done) {

            var a = {aggregate_result: {field1: 0, field2: 2}};
            var b = {aggregate_result: {field1: 2, field2: 3}};

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1, 2);
            assert.equal(r.delta.field2, 1);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        });

        it("tests normal case where all fields are 0", function (done) {

            var a = {aggregate_result: {field1: 0, field2: 0}};
            var b = {aggregate_result: {field1: 0, field2: 0}};

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1, 0);
            assert.equal(r.delta.field2, 0);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        });

        it("tests normal case where delta is negative", function (done) {

            var a = {aggregate_result: {field1: 2, field2: 2}};
            var b = {aggregate_result: {field1: 1, field2: 1}};

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1, -1);
            assert.equal(r.delta.field2, -1);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        });

        it("tests case where there is a single disjoint field", function (done) {

            var a = {aggregate_result: {field1: 2, field2: 2, field3: 3}};
            var b = {aggregate_result: {field1: 3, field2: 3}};

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1, 1);
            assert.equal(r.delta.field2, 1);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        });

        it("tests case where one input object is empty", function (done) {

            var a = {aggregate_result: {}};
            var b = {aggregate_result: {field1: 3, field2: 3}};

            var r = proc.getDeltas(a, b);

            assert.equal(Object.keys(r.delta).length, 0);

            done();

        });

        it("tests case where both input objects are empty", function (done) {

            var a = {aggregate_result: {}};
            var b = {aggregate_result: {}};

            var r = proc.getDeltas(a, b);

            assert.equal(Object.keys(r.delta).length, 0);

            done();

        });

        it("tests case inputs do not contain aggregate_result field, expected null", function (done) {

            var a = {not_aggregate_result_field: {}};
            var b = {not_aggregate_result_field: {}};

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        });

        it("tests case where input parameter a is null, expected null", function (done) {

            var a = null;
            var b = {aggregate_result: {field1: 3, field2: 3}};

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        });

        it("tests case where input parameter b is null, expected null", function (done) {

            var b = null;
            var a = {aggregate_result: {field1: 3, field2: 3}};

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        });

        it("tests case where both input parameters are null, expected null", function (done) {

            var b = null;
            var a = null;

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        });

    });

    describe("#findNextTimedExecution()", function () {

        it("should return null if there is no time field in the execution object", function (done) {

            var all     = [{time: 1}, {time: 2}];
            var current = {notTime: 1};

            var r = proc.findNextTimedExecution(current, all, 10, 10);

            assert.equal(r, null);

            done();

        });

        it("should return null if there is non-number input for timeFrame parameter", function (done) {

            var all     = [{time: 1}, {time: 2}];
            var current = {time: 1};

            var r = proc.findNextTimedExecution(current, all, "SOME STRING", 10);

            assert.equal(r, null);

            done();

        });

        it("should return null if there is non-number input for threshold parameter", function (done) {

            var all     = [{time: 1}, {time: 2}];
            var current = {time: 1};

            var r = proc.findNextTimedExecution(current, all, 10, "STRING");

            assert.equal(r, null);

            done();

        });

        it("should return null if the allExes parameter is an empty array", function (done) {

            var all     = [];
            var current = {time: 1};

            var r = proc.findNextTimedExecution(current, all, 10, 10);

            assert.equal(r, null);

            done();

        });

        it("should return null if nothing in allExes has a time field", function (done) {

            var all     = [{notTime: 1}, {notTime: 2}];
            var current = {time: 1};

            var r = proc.findNextTimedExecution(current, all, 10, 10);

            assert.equal(r, null);

            done();

        });

        it("should return null if executions in allExes are before the current one", function (done) {

            var all     = [{time: 2}, {time: 1}];
            var current = {time: 3};

            var r = proc.findNextTimedExecution(current, all, 10, 10);

            assert.equal(r, null);

            done();

        });

        it("should return null if executions in allExes are before or equal to the current one", function (done) {

            var all     = [{time: 4}, {time: 2}];
            var current = {time: 4};

            var r = proc.findNextTimedExecution(current, all, 10, 10);

            assert.equal(r, null);

            done();

        });

        it("should return one object if the times are exactly timeFrame apart", function (done) {

            var all     = [{time: 10}];
            var current = {time: 5};

            var r = proc.findNextTimedExecution(current, all, 5, 0);

            assert.deepEqual(r, {time: 10});

            done();

        });

        it("should return one object if the times are exactly within timeFrame and threshold", function (done) {

            var all     = [{time: 10}];
            var current = {time: 5};

            var r = proc.findNextTimedExecution(current, all, 5, 1);

            assert.deepEqual(r, {time: 10});

            done();

        });

        it("should return one object if the times are on the upper edge of the timeFrame and threshold", function (done) {

            var all     = [{time: 11}];
            var current = {time: 5};

            var r = proc.findNextTimedExecution(current, all, 5, 1);

            assert.deepEqual(r, {time: 11});

            done();

        });

        it("should return one object if the times are on the lower edge of the timeFrame and threshold", function (done) {

            var all     = [{time: 9}];
            var current = {time: 5};

            var r = proc.findNextTimedExecution(current, all, 5, 1);

            assert.deepEqual(r, {time: 9});

            done();

        });

        it("should exclude objects that are obviously outside (lower) the timeFrame and threshold", function (done) {

            var all     = [{time: 8}];
            var current = {time: 5};

            var r = proc.findNextTimedExecution(current, all, 5, 1);

            assert.deepEqual(r, null);

            done();

        });


        it("should exclude objects that are obviously outside (upper) the timeFrame and threshold", function (done) {

            var all     = [{time: 12}];
            var current = {time: 5};

            var r = proc.findNextTimedExecution(current, all, 5, 1);

            assert.deepEqual(r, null);

            done();

        });

        it("should return the closest object to the timeFrame if multiple executions are within the timeFrame+threshold", function (done) {

            var all     = [{time: 12}, {time: 10}, {time: 8}];
            var current = {time: 5};

            var r = proc.findNextTimedExecution(current, all, 5, 3);

            assert.deepEqual(r, {time: 10});

            done();

        });

        it("should return the closest object to the timeFrame (off-center) if multiple executions are within the timeFrame+threshold", function (done) {

            var all     = [{time: 12}, {time: 11}, {time: 8}];
            var current = {time: 5};

            var r = proc.findNextTimedExecution(current, all, 5, 3);

            assert.deepEqual(r, {time: 11});

            done();

        });

        it("test real world data", function (done) {

            var all     = [{time: 1420143132}, {time: 1421352732}, {time: 1422821532}, {time: 1425240732}];
            var current = {time: 1420143132};

            var r = proc.findNextTimedExecution(current, all, null, null); //using defaults from timeFrame and threshold

            assert.deepEqual(r, {time: 1422821532});

            done();

        });
    });

    describe("#getExecutionsSeperatedByOneMonth()", function () {

        it("should return null if null start parameter is provided", function (done) {

            var exes = [{}, {}];

            var r = proc.getExecutionsSeparatedByOneMonth(null, exes);

            assert.equal(r, null);

            done();
        });

        it("should return null if null exes parameter is provided", function (done) {

            var exes = [{}, {}];

            var r = proc.getExecutionsSeparatedByOneMonth({time: 1}, null);

            assert.equal(r, null);

            done();
        });

        it("should return null if start without time is provided", function (done) {

            var exes  = [{}, {}];
            var start = {notTime: 1};

            var r = proc.getExecutionsSeparatedByOneMonth(start, exes);

            assert.equal(r, null);

            done();
        });

        it("should return null if empty exes array is provided.", function (done) {

            var exes  = [];
            var start = {time: 1};

            var r = proc.getExecutionsSeparatedByOneMonth(start, exes);

            assert.equal(r, null);

            done();
        });


        it("should return null if the start object is the only value in the array", function (done) {

            var exes  = [{time: 1}];
            var start = {time: 1};

            var r = proc.getExecutionsSeparatedByOneMonth(start, exes);

            assert.equal(r, null);

            done();
        });

        it("should return array with three elements if tested with normal data.", function (done) {

            var all     = [{time: 1420143132}, {time: 1421352732}, {time: 1422821532}, {time: 1425240732}];
            var current = {time: 1420143132};

            var r = proc.getExecutionsSeparatedByOneMonth(current, all);

            assert.equal(r.length, 3);
            assert.equal(r[0].time, 1420143132);
            assert.equal(r[1].time, 1422821532);
            assert.equal(r[2].time, 1425240732);

            done();
        });

        it("should return array with three elements for data with mixed valid and null objects.", function (done) {

            var all     = [{time: 1420143132}, {time: 1421352732}, {time: 1422821532}, {time: "string"}, {notTime: 1}, {time: 1425240732}];
            var current = {time: 1420143132};

            var r = proc.getExecutionsSeparatedByOneMonth(current, all);

            assert.equal(r.length, 3);
            assert.equal(r[0].time, 1420143132);
            assert.equal(r[1].time, 1422821532);
            assert.equal(r[2].time, 1425240732);

            done();
        });

    });

    describe("#getOldestExecutionOnDay()", function () {

        it("should return null if the exes parameter is null ", function (done) {

            var r = proc.getOldestExecutionOnDay(null, 1);

            assert.equal(r, null);

            done();

        });

        it("should return null if the exes parameter is empty array ", function (done) {

            var r = proc.getOldestExecutionOnDay([], 1);

            assert.equal(r, null);

            done();

        });

        it("should return null if the dayNum parameter is null  ", function (done) {

            var r = proc.getOldestExecutionOnDay([{}], null);

            assert.equal(r, null);

            done();

        });

        it("should return null if the dayNum parameter is negative  ", function (done) {

            var r = proc.getOldestExecutionOnDay([{}], -1);

            assert.equal(r, null);

            done();

        });

        it("should return null if the dayNum parameter is greater than 31  ", function (done) {

            var r = proc.getOldestExecutionOnDay([{}], 32);

            assert.equal(r, null);

            done();

        });

        it("should return null if none of executions have a dayNum day of month", function (done) {

            var exes = [

                {time: 1435172289}, //June 24 2015
                {time: 1434394681}, //June 15 2015
                {time: 1431716281}, //May 15 2015
                {time: 1430593081}, //May 2 2015
                {time: 1433098681} //May 31 2015

            ];

            var r = proc.getOldestExecutionOnDay(exes, 1);

            assert.equal(r, null);

            done();

        });

        it("should return an object if one of time stamps is on 1st of month", function (done) {

            var exes = [

                {time: 1435172289}, //June 24 2015
                {time: 1434394681}, //June 15 2015
                {time: 1431716281}, //May 15 2015
                {time: 1430593081}, //May 2 2015
                {time: 1430506681} //May 1 2015

            ];

            var r = proc.getOldestExecutionOnDay(exes, 1);

            assert.deepEqual(r, {time: 1430506681});

            done();

        });

        it("should return the earlier execution if two occured on the first of some month(s)", function (done) {

            var exes = [

                {time: 1435172289}, //June 24 2015
                {time: 1434394681}, //June 15 2015
                {time: 1431716281}, //May 15 2015
                {time: 1430593081}, //May 2 2015
                {time: 1430506681}, //May 1 2015
                {time: 1433185081} //June 1 2015

            ];

            var r = proc.getOldestExecutionOnDay(exes, 1);

            assert.deepEqual(r, {time: 1430506681});

            done();

        });

        it("should return a valid object if it exists even if there are invalid input objects", function (done) {

            var exes = [

                {time: 1430506681}, //May 1 2015
                {time: 1435172289}, //June 24 2015
                {notTime: 1434394681}, //June 15 2015
                {time: null}, //May 15 2015
                {time: "some string"} //May 2 2015

            ];

            var r = proc.getOldestExecutionOnDay(exes, 1);

            assert.deepEqual(r, {time: 1430506681});

            done();

        });
    });

});