'use strict';
var logger        = require('../logger').Logger('DemographicsResultManager', 2);
var groups        = require('../groups');
var util          = require('util');
var ResultManager = require("./ResultManager").ResultManager;
var request       = require('request');
var async         = require('async');


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
        if (matches[1] !== 'undefined' &&
            matches[1] !== 'undifferentiated' &&
            matches[1] !== 'female' &&
            matches[1] !== 'male'
        ) {
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

    var generateResult = function (input) {

        return null;

    };


    var getFormattedData = function (next) {

        next(proc.generateResult(proc.data));

    };

    //add protected functions here. 
    proc.createDataObjectFromSplit = createDataObjectFromSplit;
    proc.generateResult            = generateResult;

    //add public functions here.
    that.getFormattedData = getFormattedData;


    return that;

}

module.exports = {DemographicsResultManager: DemographicsResultManager};