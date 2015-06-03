'use strict';
var logger = require('./logger').Logger('RatioResultManager', 2); 
var groups = require('./groups');
var util   = require('util');
var ResultManager = require("./ResultManager").ResultManager;
var request = require('request');
var async   = require('async');


/**
* An object that is used to encapsulate results for the 
* med class query. 
* 
* This object extends the functionality in the abstract
* object ResultManager.
* 
* Follows the Functional pattern presented in:
*   "JavaScript: The Good Parts" by Douglas Crockford. 
*
* @param id {String} - the ID of the provider we are interested in. 
* @param data {Object} - the data object from MongoDB that a record of an execution.
* @param proc {Object} - an object to encapsulate protected variables or functions. Anything 
*   within this object can be made visible to sub-objects of this one. 
*
* @return {Object} - an object that contains only public attributes/methods for this 
*   object. 
*/
function RatioResultManager( id, data, proc ){

    proc = proc || {};  

    //set the string that is used to split map/reduce results into
    //relevant pieces. 
    //Looks for: 
    // 
    proc.regexString = '^(numerator+|denominator+)_(.+)$';

    //here we get the abstract object ResultManager and 
    // then add/modify methods that need to implemented.
    // attributes and methods that "protected" within the 
    // ResultManager object will be accessible through the 
    // proc variable that is passed to ResultManager
    var that = ResultManager(id, data, proc);

    /**
    * Med class query specific implementation of the method
    * in the ResultManager object. 
    *
    * @param matches {Array} - An array that is returned from Regex.exec()
    *   with the matches for the groups identified in the proc.regexString attribute
    * 
    * @return {Object} - An object that represents that matches. Returns null if 
    *   If there was invalid input. Regular returned object has structure like:
    *   { "field" : "XXX" clinician" : "XXXX" } where "field" is either numerator or denominator
    */
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

    /**
    * Determines the total number of prescriptions 
    * in the input object. Sums all of the values together.
    * 
    * @param input {Object} -  An object where the keys are drug classes and 
    *   values are the number of drugs that were prescribed. Has structure like:
    *   { "CLASS_1" : X, "CLASS_2" : Y, ... }
    * 
    * @return {Number} - The sum of all drugs. Returns -1 if there was an error.
    */
    var getTotal = function(input){

        if ( !input ){

            return -1; 

        } 

        var sum = 0; 

        for( var i in input ){

            if( !input.hasOwnProperty(i) ){
                continue;
            }

            sum += input[i]; 

        }

        return sum; 

    }

    var combineNumeratorAndDenominators = function(input){

        //need to find a num and den match for a clinician id. 
        //then combine them into one object.

        if ( !input || !input.length ){

            return []; 

        }

        var toReturn = []; 
        var tmp = {}; 

        for( var i = 0; i < input.length; i++ ){

            tmp = {}; 

            for( var j = 0; j < input.length; j++ ){

                if( 
                    input[i].clinician !== null &&
                    input[j].clinician !== null &&
                    input[i].clinician === input[j].clinician && 
                    input[i].field !== input[j].field 
                ){

                    tmp.clinician = input[i].clinician; 

                    if( input[i].field === 'numerator' && input[j].field === 'denominator' ){

                        tmp.numerator = input[i].count; 
                        tmp.denominator = input[j].count; 

                    }else if( input[i].field === 'denominator' && input[j].field === 'numerator' ){

                        tmp.numerator = input[j].count; 
                        tmp.denominator = input[i].count; 

                    }

                    toReturn.push(tmp);

                    //nuke these values so that we don't use them again 
                    input[i].clinician = null; 
                    input[j].clinician = null; 

                    break; //break out of the inner loop as we have found a match.
                }

            }

        }

        return toReturn; 

    }; 

    var reduce = function(input){

        //return: { numerator: X, denominator: X }

        var num = 0; 
        var den = 0; 

        for( var i = 0; i < input.length; i++ ){

            if( input[i].numerator && input[i].denominator ){

                num += input[i].numerator; 
                den += input[i].denominator;

            }

        }

        return { numerator : num, denominator : den }; 

    }


    var generateResult = function(input, next){

        var finalResult = { 'processed_result' : {} , "provider_id" : id }; 

        input = combineNumeratorAndDenominators(input);

        logger.error(util.inspect(input, false, null));

        proc.setData(input);

        var network = that.getNetwork();
        var group   = that.getGroup(); 
        var self    = that.getSelf(); 

        var reducedNetwork  = reduce(network);
        var reducedGroup    = reduce(group);
        var reducedSelf     = reduce(self);

        logger.success(util.inspect(reducedNetwork, false, null)); 
        logger.warn(util.inspect(reducedGroup, false, null)); 
        logger.error(util.inspect(reducedSelf, false, null)); 

        finalResult.processed_result.clinician  = [ { aggregate_result : reducedSelf, time : proc.data.time } ]; 
        finalResult.processed_result.group      = [ { aggregate_result : reducedGroup, time : proc.data.time} ]; 
        finalResult.processed_result.network    = [ { aggregate_result : reducedNetwork, time : proc.data.time } ]; 

        next(finalResult);

    }

    var getFormattedData = function(next){

        generateResult(that.getNetwork(), next);

    }

    //add protected functions here. 
    proc.createDataObjectFromSplit  = createDataObjectFromSplit;

    //add public functions here.
    that.getFormattedData    = getFormattedData; 


    return that; 

}

module.exports = { RatioResultManager : RatioResultManager }