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

    // TODO:  CHANGE ME TO MATCH DEMOGRPHICS
    proc.regexString = '^([a-zA-Z0-9]+)_(.+)_(.+)$';

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
     * @return {Object} - An object that represents that matches. Returns null if
     *   If there was invalid input. Regular returned object has structure like:
     *   { "code" : "XXXX", "codeSystem" : "XXXX", "clinician" : "XXXX" }
     */
    var createDataObjectFromSplit = function (matches) {

        // TODO: change me to handle demographics matches.

        return {};

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