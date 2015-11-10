'use strict';
var logger = require('../logger').Logger('RetroRatioResultManager', 1);
var util   = require('util');
var RatioResultManager = require("./RatioResultManager").RatioResultManager;


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
function RetroRatioResultManager(id, data, init, proc) {

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
    var that = RatioResultManager(id, data, init, proc);

    var generateResult = function (input, next) {

        var finalResult = {'processed_result': {}, "provider_id": id};

        if (!input) {

            return finalResult;

        }

        try {

            //create an array of ratio result managers to manage
            //each execution;s data. 
            for (var i = 0; i < input.length; i++) {

                proc.resultManagers.push(RatioResultManager(id, input[i], init));

            }

            //we now have a list of RatioResultManagers, one for
            //each execution.

            //make fields in the processed_result to be written to: 

            finalResult.processed_result.clinician = [];
            finalResult.processed_result.group     = [];
            finalResult.processed_result.network   = [];
            finalResult.processed_result.anonymous = {};

            var tmpResult = null;

            for (var i = 0; i < proc.resultManagers.length; i++) {


                tmpResult = proc.resultManagers[i].generateResult().processed_result;

                if (!tmpResult) {

                    continue;

                }

                finalResult.processed_result.clinician.push(tmpResult.clinician[0]);
                finalResult.processed_result.group.push(tmpResult.group[0]);
                finalResult.processed_result.network.push(tmpResult.network[0]);

                for (var k in JSON.parse(JSON.stringify(tmpResult.anonymous))) {

                    //check if we have this person in our list already.
                    if (!(k in finalResult.processed_result.anonymous)) {

                        finalResult.processed_result.anonymous[k] = [];

                    }

                    finalResult.processed_result.anonymous[k].push(tmpResult.anonymous[k]);

                }
            }

            return finalResult;

        } catch (e) {

            logger.error("Caught an exception: " + util.inspect(e, false, null));
            logger.error(e.stack);
            return {'processed_result': {}, "provider_id": id};

        }

    };

    var getFormattedData = function (next) {

        next(proc.generateResult(proc.data));

    };

    //add protected functions here. 
    proc.generateResult = generateResult;

    //add public functions here.
    that.getFormattedData = getFormattedData;

    return that;

}

module.exports = {RetroRatioResultManager: RetroRatioResultManager};
