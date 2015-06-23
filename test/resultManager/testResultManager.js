var assert = require("assert")

var ResultManager = require('../../lib/resultManager/ResultManager.js').ResultManager; 

var rm          = null;
var testData    = null; 
var proc        = null; 

var createDataObjectFromSplit = function(matches){

    if ( !matches || matches.length !== 3 ){

        logger.debug("Parameter matches was invalid input to RatioResultManager.createDataObjectFromSplit()");
        return null; 

    }

    return {

        field : matches[1],
        clinician : matches[2]

    };

}; 

describe('ResultManager', function(){

    beforeEach(function(done){

        proc = {}


        testData = {

            aggregate_result : {

                "denominator_cpsid" : 5,
                "numerator_cpsid" : 4, 
                "denominator_cpsid1" : 2,
                "numerator_cpsid1" : 1,
                "numerator_cpsid4" : 10,
                "denominator_cpsid4" : 20 

            }

        };

        rm = ResultManager("cpsid", testData, proc); 

        proc.regexString = "^(numerator+|denominator+)_(.+)$";

        proc.createDataObjectFromSplit = createDataObjectFromSplit; 

        done(); 

    });

    afterEach(function(done){

        proc.regexString                = null;
        proc.createDataObjectFromSplit  = null; 
        proc                            = null; 
        rm                              = null; 

        done();

    });

    describe('#getData()', function(){
        it('should return data for 3 providers', function( done ){

           var result = proc.getData(); 

            assert.equal(result.length, 6);

            assert.equal(result[0].field, 'denominator');
            assert.equal(result[0].clinician, 'cpsid');
            assert.equal(result[0].count, 5);

            assert.equal(result[1].field, 'numerator');
            assert.equal(result[1].clinician, 'cpsid');
            assert.equal(result[1].count, 4);

            assert.equal(result[2].field, 'denominator');
            assert.equal(result[2].clinician, 'cpsid1');
            assert.equal(result[2].count, 2);

            assert.equal(result[3].field, 'numerator');
            assert.equal(result[3].clinician, 'cpsid1');
            assert.equal(result[3].count, 1);

            done(); 

        }); 

        it('should return an empty array of data if the data input is empty', function(done){

            proc.data = {}; 

            var result = proc.getData(); 

            assert.equal(result.length, 0);

            done();

        });

        it('should thrown an exception if proc.regexString is falsey', function(done){

            proc.regexString = null; 

            assert.throws(proc.getData);

            done();

        })

    });

    describe("#getNetwork()", function(){

        it("should return 3 providers of data", function(done){

            var result = rm.getNetwork(); 

            assert.equal(result.length, 6);

            done(); 

        });

    });

    describe("#getGroup()", function(){


        it('should return 2 providers with their data', function(done){

            var result = rm.getGroup(); 

            assert.equal(result.length, 4);

            assert.equal(result[0].clinician, 'cpsid');
            assert.equal(result[2].clinician, 'cpsid1');

            done();

        });

    });

     
});
