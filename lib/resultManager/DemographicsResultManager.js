'use strict';
var logger        = require('../logger').Logger('DemographicsResultManager', 1);
var groups        = require('../groups');
var util          = require('util');
var ResultManager = require("./ResultManager").ResultManager;
var request       = require('request');
var async         = require('async');


var SUPPORTED_GENDERS = ['male', 'female', 'undifferentiated', 'undefined'];

var SUPPORTED_AGERANGES = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90+'];

/**
 * An object that is used to encapsulate results for the
 * demographics query.
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
function DemographicsResultManager(id, data, proc) {

    proc = proc || {};

    //set the string that is used to split map/reduce results into
    //relevant pieces. 
    //Looks for:

    proc.regexString = '^([a-zA-z]+)_([0-9]{1,2})-?([0-9]{1,2}|\\+)_(.+)$';

    proc.supportedGenders = SUPPORTED_GENDERS;

    //here we get the abstract object ResultManager and 
    // then add/modify methods that need to implemented.
    // attributes and methods that "protected" within the 
    // ResultManager object will be accessible through the 
    // proc variable that is passed to ResultManage
    var that = ResultManager(id, data, proc);

    /**
     * Demographics query specific implementation of the method
     * in the ResultManager object.
     *
     * @param matches {Array} - An array that is returned from Regex.exec()
     *   with the matches for the groups identified in the proc.regexString attribute
     *
     * @return {Object} - An object that represents that matches. Returns null
     *   if there was invalid input. Regular returned object has structure like:
     *      { gender: STRING, lowerAge : NUMBER, upperAge : NUMBER, clinician : STRING, original : STRING }
     *   In cases where there is no upper age bound (e.g age range is 90+) upperAge will be null.
     */
    var createDataObjectFromSplit = function (matches) {

        //we expected the matches object to be an array with length 5.
        if (!matches || !matches.length || matches.length !== 5) {

            logger.debug("Invalid matches for Demographics results.");
            return null;

        }

        //filter out unknown gender types, valid is: undefined, undifferentiated, female, male
        if (proc.supportedGenders.indexOf(matches[1]) < 0) {
            logger.debug("Failed to find match for gender in split for: " + matches[0]);
            return null;
        }

        //if we get to here we have a clean object.

        return {
            gender   : matches[1],
            lowerAge : parseInt(matches[2]),
            upperAge : matches[3] === '+' ? null : parseInt(matches[3]),
            clinician: matches[4],
            original : matches[0]

        };

    };

    var generateResult = function () {

        //set up data structure for return.

        var finalResult = {
            processed_result: {

                clinician: [],
                group    : [],
                network  : []

            },
            provider_id     : id
        };

        var clinician = that.getSelf();
        var group     = that.getGroup();
        var network   = that.getNetwork();

        logger.debug(util.inspect(clinician));

        clinician = proc.combineByGender(clinician);
        group     = proc.combineByGender(group);
        network   = proc.combineByGender(network);

        //check that all results back were valid.
        if (!clinician || !group || !network || !proc.data.time) {

            return null;

        }

        clinician.time = proc.data.time;
        group.time     = proc.data.time;
        network.time   = proc.data.time;

        finalResult.processed_result.clinician.push(clinician);
        finalResult.processed_result.group.push(group);
        finalResult.processed_result.network.push(network);

        return finalResult;

    };


    /**
     * Combines data objects based on the gender field. Expects objects of same structure as returned by createDataObjectsFromSplit.
     *
     * @param input {Array} - An array of objects that have structure like: { gender : STRING, lowerAge : NUMBER, upperAge: NUMBER, count : NUMBER }
     * @returns {Object} - Has structure like: { GENDER_STRING : { AGE_STRING : NUMBER, ...}, ... }. If there are other fields in the
     *      input they will be ignored and not returned. Returns null if there is an error/failure or no valid data.
     */
    var combineByGender = function (input) {

        if (!input || !input.length) {

            return null;

        }

        try {

            var toReturn = {};

            //loop through an initialize every field.
            for (var j = 0; j < proc.supportedGenders.length; j++) {

                toReturn[proc.supportedGenders[j]] = {};

                for (var k = 0; k < proc.supportedAgeRanges.length; k++) {

                    toReturn[proc.supportedGenders[j]][proc.supportedAgeRanges[k]] = 0;

                }

            }


            var tmpKey = null;

            for (var i = 0; i < input.length; i++) {

                if (!input[i].gender ||
                    input[i].lowerAge === null ||
                    input[i].lowerAge === undefined ||
                    proc.supportedGenders.indexOf(input[i].gender) < 0
                ) {


                    logger.debug("Unsupported gender: " + input[i].gender + " in " + util.inspect(proc.supportedGenders));

                    //check that we are working on a valid object.
                    continue;

                }

                //this represents the age range
                tmpKey = input[i].upperAge ? input[i].lowerAge + "-" + input[i].upperAge : input[i].lowerAge + "+";

                //test if we have already seen this gender type.
                if (toReturn[input[i].gender]) {

                    //check if we have already seen this age range for this gender
                    if (toReturn[input[i].gender][tmpKey]) {

                        toReturn[input[i].gender][tmpKey] += input[i].count;

                    } else {

                        toReturn[input[i].gender][tmpKey] = input[i].count;

                    }

                } else { //haven't seen gender type, create it in the toReturn

                    toReturn[input[i].gender]         = {};
                    toReturn[input[i].gender][tmpKey] = input[i].count

                }
            }

            //check that we actually have data to return. Otherwise return null
            return Object.keys(toReturn).length === 0 ? null : toReturn;

        } catch (e) { //we are doing alot of indexing here, should make sure we don't crash the process

            logger.error("combineByGender() threw an error: " + util.inspect(e));
            logger.error(e.stack);
            return null;

        }

    };

    var getFormattedData = function (next) {

        next(proc.generateResult());

    };

    //add protected functions here. 
    proc.createDataObjectFromSplit = createDataObjectFromSplit;
    proc.combineByGender           = combineByGender;
    proc.generateResult            = generateResult;
    proc.supportedAgeRanges        = SUPPORTED_AGERANGES;
    proc.supportedGenders          = SUPPORTED_GENDERS;

    //add public functions here.
    that.getFormattedData = getFormattedData;
    that.generateResult   = proc.generateResult;

    return that;

}

module.exports = {
    DemographicsResultManager: DemographicsResultManager,
    SUPPORTED_GENDERS        : SUPPORTED_GENDERS,
    SUPPORTED_AGERANGES      : SUPPORTED_AGERANGES
};