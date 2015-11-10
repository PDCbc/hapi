var logger = require('../logger').Logger('RatioResultManager', 1);
var groups = require('../groups');
var util   = require('util');
var ResultManager = require("./ResultManager").ResultManager;
var request = require('request');
var async  = require('async');
var sha224 = require('js-sha256').sha224;


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
function RatioResultManager(id, data, init, proc) {

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
    var that = ResultManager(id, data, init, proc);

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
    var createDataObjectFromSplit = function (matches) {

        if (!matches || matches.length !== 3) {

            logger.debug("Parameter matches was invalid input to RatioResultManager.createDataObjectFromSplit()");
            return null;

        }

        return {

            field: matches[1],
            clinician: matches[2]

        };

    };

    /**
     * Merges separate numerator and denominator objects together if
     * they share the same clinician identifier. Only merges pairs of objects
     * where one has a numerator field and the other has a denominator field.
     *
     * @param input {Array} - An array of objects to merge. Has structure like:
     *   [ { clinician : "XXX", field : "denominator|numerator", count: X }, .... ]
     *
     * @return {Array} - An array of the merged objects, has structure like:
     *   [ { clinician: "XXX", numerator : X, denominator: X }, ... ]
     *   Returns [] if there is invalid input.
     */
    var combineNumeratorAndDenominators = function (input) {

        //need to find a num and den match for a clinician id. 
        //then combine them into one object.

        if (!input || !input.length) {

            return [];

        }

        var toReturn = [];
        var tmp      = {};

        for (var i = 0; i < input.length; i++) {

            tmp = {};

            for (var j = 0; j < input.length; j++) {

                try {

                    if (
                        input[i].clinician !== null &&
                        input[j].clinician !== null &&
                        input[i].clinician === input[j].clinician &&
                        input[i].field !== input[j].field
                    ) {

                        tmp.clinician = input[i].clinician;

                        if (input[i].field === 'numerator' && input[j].field === 'denominator') {

                            tmp.numerator   = input[i].count;
                            tmp.denominator = input[j].count;

                        } else if (input[i].field === 'denominator' && input[j].field === 'numerator') {

                            tmp.numerator   = input[j].count;
                            tmp.denominator = input[i].count;

                        }

                        toReturn.push(tmp);

                        //nuke these values so that we don't use them again 
                        input[i].clinician = null;
                        input[j].clinician = null;

                        break; //break out of the inner loop as we have found a match.
                    }

                } catch (e) { //catch any issues

                    logger.error("Failed to find denominator/numerator pair. Ignoring this pair.", "combineNumeratorAndDenominators()");
                    input[i].clinician = null;
                    input[j].clinician = null;

                }

            }

        }

        return toReturn;

    };

    /**
     * Combines all of the results from the input into numerator/denominator pair. Filters the resulting numerator/denominator
     *  pair to ensure that neither number of less than 5; if they are less than 5 they are cast to zero.
     *
     * @param input {Array} - An array of inputs to reduce. Has structure like:
     *   [ { clinician : "XXX", field : "denominator|numerator", count: X }, .... ]
     *
     * @return {Object} - An object that has the combined numerator and denominator.
     *   has structure like: { numerator : X, denominator : X }. If the input is invalid
     *   an empty object is returned. The result is filted through a privacy filter for the
     *   n < 5 rule.
     */
    var reduce = function (input) {

        if (!input) {

            return {};

        }

        var num = 0;
        var den = 0;

        for (var i = 0; i < input.length; i++) {

            try {

                if (
                    input[i].numerator !== null &&
                    input[i].numerator !== undefined &&
                    input[i].denominator !== null &&
                    input[i].denominator !== undefined
                ) {

                    num += input[i].numerator;
                    den += input[i].denominator;

                }

            } catch (e) { //catch any errors so that we don't crash the process.

                logger.warn("Failed to reduce based on numerator/denominator pair, ignoring this pair.", "reduce()");

            }

        }


        num = proc.privacyFilter(num);
        den = proc.privacyFilter(den);

        return {numerator: num, denominator: den};

    };

    /**
     * Hashes the clinician ids that are provided to it and creates
     * a data structure to return that holds the anonymous data.
     */
    var getAnonymousData = function (input) {

        if (!input || !input.length) {

            return {};

        }

        var toReturn = {};
        var hash     = null;

        try {

            for (var i = 0; i < input.length; i++) {

                if (
                    input[i].numerator &&
                    input[i].denominator &&
                    input[i].clinician !== id
                ) {

                    hash = sha224(input[i].clinician);

                    toReturn["PROVIDER_" + hash] = {
                        aggregate_result: {
                            numerator: input[i].numerator,
                            denominator: input[i].denominator
                        },
                        time: proc.data.time
                    };

                }

            }

        } catch (e) {

            logger.error("Failed to generate anonymous data, will use empty object instead.", "getAnonymousData()");

        }

        return toReturn;

    };

    var generateResult = function (input) {
        	
        input = input || that.getNetwork();

        var finalResult = {'processed_result': {}, "provider_id": id};

        input = combineNumeratorAndDenominators(input);

        proc.setData(input);

        var network = that.getNetwork();
        var group = that.getGroup();
        var self  = that.getSelf();

        var reducedNetwork = reduce(network);
        var reducedGroup   = reduce(group);
        var reducedSelf    = reduce(self);

	console.log(util.inspect(proc.data, false, null)); 
	
	if(proc.data.aggregate_result){
		finalResult.processed_result.clinician = [{
		    aggregate_result: reducedSelf,
		    time: proc.data.time,
		    display_name: "Clinician",
		    simulated: proc.data.aggregate_result.simulated === undefined ? false : proc.data.aggregate_result.simulated
		}];
		finalResult.processed_result.group     = [{
		    aggregate_result: reducedGroup,
		    time: proc.data.time,
		    display_name: "Group (" + groups.findGroup(id, init) + ")",
		    simulated: proc.data.aggregate_result.simulated === undefined ? false : proc.data.aggregate_result.simulated
		}];
		finalResult.processed_result.network   = [{
		    aggregate_result: reducedNetwork,
		    time: proc.data.time,
		    display_name: "Network",
		    simulated: proc.data.aggregate_result.simulated === undefined ? false : proc.data.aggregate_result.simulated
		}];
	}

	console.log(util.inspect(finalResult, false, null)); 

        finalResult.processed_result.anonymous = getAnonymousData(group);

        return finalResult;

    };

    var getFormattedData = function (next) {

        next(generateResult(that.getNetwork()));

    };

    //add protected functions here. 
    proc.createDataObjectFromSplit       = createDataObjectFromSplit;
    proc.getAnonymousData                = getAnonymousData;
    proc.combineNumeratorAndDenominators = combineNumeratorAndDenominators;
    proc.reduce                          = reduce;

    //add public functions here.
    that.getFormattedData = getFormattedData;
    that.generateResult   = generateResult;

    return that;

}

module.exports = {RatioResultManager: RatioResultManager};
