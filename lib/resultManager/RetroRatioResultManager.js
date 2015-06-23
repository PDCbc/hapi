'use strict';
var logger = require('../logger').Logger('RetroRatioResultManager', 2); 
var groups = require('../groups');
var util   = require('util');
var RatioResultManager = require("./RatioResultManager").RatioResultManager;
var request = require('request');
var async   = require('async');
var sha224 = require('js-sha256').sha224;


/**
* An object that is used to encapsulate results for a retrospective 
* ratio type query. 

* This object extends the functionality in the abstract
* object ResultManager and Concrete class RatioResultManager.
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
function RetroRatioResultManager( id, data, proc ){

    proc = proc || {};  

    //set the string that is used to split map/reduce results into
    //relevant pieces. 
    //Looks for: 
    // 
    proc.regexString = '^(numerator+|denominator+)_(.+)$';

    //an array of RatioResultManager objects, one for each
    //execution of the query.
    proc.resultManagers = []; 

    //here we get the abstract object ResultManager and RatioResultManager  
    // and then add/modify methods that need to implemented.
    // attributes and methods that "protected" within the 
    // ResultManager object will be accessible through the 
    // proc variable that is passed to ResultManager
    var that = RatioResultManager(id, data, proc);

    var generateResult = function(input, next){

        var finalResult = { 'processed_result' : {} , "provider_id" : id }; 

        logger.warn(util.inspect(input));

        //create an array of ratio result managers to manage
        //each execution;s data. 
        for( var i = 0; i < input.length; i++ ){

            proc.resultManagers.push(RatioResultManager(id, input[i])); 

        }

        //we now have a list of RatioResultManagers, one for
        //each execution.

        



        next(finalResult);

    }

    var getFormattedData = function(next){

        proc.generateResult(proc.data, next);

    }

    //add protected functions here. 
    proc.generateResult = generateResult; 

    //add public functions here.
    that.getFormattedData    = getFormattedData; 

    return that; 

}

module.exports = { RetroRatioResultManager : RetroRatioResultManager }