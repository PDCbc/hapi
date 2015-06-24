var assert = require('assert');

var TimedReport = require('../../lib/reports/TimedReport.js').TimedReport;

var tr = null; 
var proc = null;

describe('TimedReport', function(){

    beforeEach(function(done){

        proc = {}; 

        tr = TimedReport("shortName", "name", [], proc);

        done();

    });

    afterEach(function(done){

        proc    = null; 
        tr      = null; 

        done();

    });

    describe("#generateCSVReport()", function(){


        it('should thrown an error if called', function(done){

            assert.throws(proc.generateCSVReport);

            done();
        });

    });

    describe('#getDeltas()', function(){

        it("tests normal case where all fields are the same", function(done){

            var a = { aggregate_result : { field1 : 1, field2: 2} }; 
            var b = { aggregate_result : { field1 : 2, field2: 3} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1 , 1);
            assert.equal(r.delta.field2 , 1);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        });

       it("tests normal case where some fields are 0", function(done){

            var a = { aggregate_result : { field1 : 0, field2: 2} }; 
            var b = { aggregate_result : { field1 : 2, field2: 3} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1 , 2);
            assert.equal(r.delta.field2 , 1);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        }); 

        it("tests normal case where all fields are 0", function(done){

            var a = { aggregate_result : { field1 : 0, field2: 0} }; 
            var b = { aggregate_result : { field1 : 0, field2: 0} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1 , 0);
            assert.equal(r.delta.field2 , 0);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        }); 

        it("tests normal case where delta is negative", function(done){

            var a = { aggregate_result : { field1 : 2, field2: 2} }; 
            var b = { aggregate_result : { field1 : 1, field2: 1} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1 , -1);
            assert.equal(r.delta.field2 , -1);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        }); 

        it("tests case where there is a single disjoint field", function(done){

            var a = { aggregate_result : { field1 : 2, field2: 2, field3: 3} }; 
            var b = { aggregate_result : { field1 : 3, field2: 3} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(r.delta.field1 , 1);
            assert.equal(r.delta.field2 , 1);
            assert.equal(Object.keys(r.delta).length, 2);

            done();

        }); 

        it("tests case where one input object is empty", function(done){

            var a = { aggregate_result : { } }; 
            var b = { aggregate_result : { field1 : 3, field2: 3} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(Object.keys(r.delta).length, 0);

            done();

        }); 

        it("tests case where both input objects are empty", function(done){

            var a = { aggregate_result : { } }; 
            var b = { aggregate_result : { } }; 

            var r = proc.getDeltas(a, b);

            assert.equal(Object.keys(r.delta).length, 0);

            done();

        }); 

        it("tests case inputs do not contain aggregate_result field, expected null", function(done){

            var a = { not_aggregate_result_field : {} }; 
            var b = { not_aggregate_result_field : {} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        }); 

        it("tests case where input parameter a is null, expected null", function(done){

            var a = null; 
            var b = { aggregate_result : { field1 : 3, field2: 3} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        }); 

        it("tests case where input parameter b is null, expected null", function(done){

            var b = null; 
            var a = { aggregate_result : { field1 : 3, field2: 3} }; 

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        }); 

        it("tests case where both input parameters are null, expected null", function(done){

            var b = null; 
            var a = null;

            var r = proc.getDeltas(a, b);

            assert.equal(r, null);

            done();

        }); 

    });


});