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

    //here we get the abstract object ResultManager and RatioResultManager  
    // and then add/modify methods that need to implemented.
    // attributes and methods that "protected" within the 
    // ResultManager object will be accessible through the 
    // proc variable that is passed to ResultManager
    var that = RatioResultManager(id, data, proc);

    var generateResult = function(input, next){

        var finalResult = { 'processed_result' : {} , "provider_id" : id }; 

        logger.warn(input);

        input = proc.combineNumeratorAndDenominators(input);

        logger.warn(input);

        proc.setData(input);

        var network = that.getNetwork();
        var group   = that.getGroup(); 
        var self    = that.getSelf(); 

        var reducedNetwork  = proc.reduce(network);
        var reducedGroup    = proc.reduce(group);
        var reducedSelf     = proc.reduce(self);

        finalResult.processed_result.clinician  = [ { aggregate_result : reducedSelf, time : proc.data.time, display_name : "clinician" } ]; 
        finalResult.processed_result.group      = [ { aggregate_result : reducedGroup, time : proc.data.time, display_name : "group ("+groups.findGroup(id)+")" } ]; 
        finalResult.processed_result.network    = [ { aggregate_result : reducedNetwork, time : proc.data.time, display_name : "network" } ]; 

        finalResult.processed_result.anonymous  = proc.getAnonymousData(group);

        next(finalResult);

    }

    var getFormattedData = function(next){

        proc.generateResult(that.getNetwork(), next);

    }

    //add protected functions here. 
    proc.generateResult = generateResult; 

    //add public functions here.
    that.getFormattedData    = getFormattedData; 

    return that; 

}

module.exports = { RetroRatioResultManager : RetroRatioResultManager }