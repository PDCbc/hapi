'use strict';
var logger = require('../logger').Logger('ResultManager', 2);
var groups = require('../groups');
var util = require('util');

/**
 * An abstract object that can be extended and then
 * used to encapsulate a set of execution results.
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
function ResultManager(id, data, proc) {

    var that = {};

    //set up the protected variables for this object.
    proc = proc || {};
    proc.data = data;

    var splitData   = null;
    var selfData    = null;
    var groupData   = null;
    var networkData = null;

    /**
     * Creates an object from a set of matches in the map/reduce output.
     * This method must be implemented by a sub-object as the specifics of
     * how to format the data object may vary from one type of result to another.
     *
     * For example, the medclass query version of this returns:
     *   { code : 'XXX', codeSystem : 'XXXX', clinician : 'XXXX' }
     *
     * @param matches {Array} - The result of Javascripts Regex.exec() method
     *   being called.
     *
     * @return {Object} - An object that has the matches from the regex organized in a
     *   usable way. The structure of the object will vary depending on the type of
     *   result that is being worked with. If an invalid input is provided, this method
     *   will return null.
     */
    var createDataObjectFromSplit = function (matches) {

        throw {

            name: "UnimplementedMethodError",
            message: "The method ResultManager.createDataObjectFromSplit is an abstract method that must be implemented by a sub-object."

        };

    };

    /**
     * Structures the aggregate_data from the hubdb into an array of objects.
     * If this method has already been run once, a cached result will be returned.
     *
     * This method REQUIRES that the proc.regexString be set. This string will be used
     * to match on the keys in the map/reduce output and can be used to extract relevant data from
     * the map/reduce output, such as provider number.
     *
     * This method REQUIRES that the proc.createDataObjectFromSplit() method be implemented as it uses
     * this method to build objects from the result of the regular expression matching.
     *
     *
     * @return {Array} - an array of objects that represent each a single map/reduce output
     *   value. The structure of the object depends on what proc.createDataObjectFromSplit()
     *   returns.
     */
    var getData = function () {


        //regular expression that matches three groups.
        var rex     = null;
        var matches = null;

        //check to see if we have a cached result so that we don't have to 
        //repeat this split in the future
        if (splitData) {

            return splitData;

        } else {

            if (!proc.regexString) {
                throw {
                    name: "UndefinedAttributeError",
                    message: "The attribute proc.regexString is required to be set by any sub-object of ResultManager."
                };
            }

            splitData = [];

            for (var k in proc.data.aggregate_result) {

                matches = null;

                var o = null;
                //check that we haven't run up the prototype chain.
                if (proc.data.aggregate_result.hasOwnProperty(k)) {

                    rex = new RegExp(proc.regexString, 'gi');
                    matches = rex.exec(k);
                    o   = proc.createDataObjectFromSplit(matches);

                    //check that the result is valid.
                    if (o !== null) {

                        o.count = proc.data.aggregate_result[k];
                        splitData.push(o);

                    }

                }

            }

            return splitData;

        }

    };

    /**
     * Returns an array of data objects that pertain only the provider
     * that is identified by the id attribute of this ResultManager.
     *
     * @return {Array} - An array of data objects. The structure of the data
     *   objects will depend on the implementation of the proc.createDataObjectFromSplit()
     *   method that must be implemented by the sub-object.
     */
    var getSelf = function () {

        var input    = getData();
        var toReturn = [];

        for (var i = 0; i < input.length; i++) {

            if (input[i].clinician === id) {

                toReturn.push(input[i]);

            }

        }

        selfData = toReturn;

        return toReturn;

    };

    /**
     * Gets the data objects that pertain to the group the clinician identified by
     * the id attribute is in.
     *
     * @return {Array} - An array of data objects. The structure of the data
     *   objects will depend on the implementation of the proc.createDataObjectFromSplit()
     *   method that must be implemented by the sub-object.
     */
    var getGroup = function () {

        var toReturn    = [];
        var input       = getData();
        var activeGroup = proc.groups.findGroup(id);

        for (var i = 0; i < input.length; i++) {

            if (proc.groups.inGroup(input[i].clinician, activeGroup)) {

                toReturn.push(input[i]);

            }

        }

        groupData = toReturn;
        return groupData;

    };

    /**
     * Returns data objects for the entire network's work of data.

     * @return {Array} - An array of data objects. The structure of the data
     *   objects will depend on the implementation of the proc.createDataObjectFromSplit()
     *   method that must be implemented by the sub-object.
     */
    var getNetwork = function () {

        if (splitData) {

            return splitData;

        } else {

            splitData = getData();
            return splitData;

        }

    };


    /**
     * Returns data formatted as expected by the visualizer. The specifics of the structure will be
     * dependent on the type of query and visualization that is created.
     *
     * This is an abstract method, it MUST be implemented in sub-objects.
     */
    var getFormattedData = function () {

        throw {

            name: "UnimplementedMethodError",
            message: "The method ResultManager.getFormattedNetworkData is an abstract method that must be implemented by a sub-object."

        };

    };

    var setData = function (input) {

        //need to loop over and copy

        splitData = [];

        var tmp = null;
        for (var i = 0; i < input.length; i++) {
            tmp = JSON.parse(JSON.stringify(input[i]));

            splitData.push(tmp);

        }

    };

    /**
     * Determines if the value violates any privacy rules for results. Current rules are:
     *  - x < 5 : return 0; this rule is intended to protect patient privacy.
     *
     * @throws {Error} if the input x is not a number type
     *
     * @param x {Number} - the number to check for a privacy violation
     * @returns {Number} - 0 if there is a privacy violation, the original number x otherwise.
     */
    var privacyFilter  = function (x) {

        if (x === null || x === undefined || typeof x !== "number") {
            throw new Error("ResultManager.privacyFilter(Number) expects a number input.");
        }

        if (x < 5) {
            return 0;
        } else {
            return x;
        }

    };

    //protected methods
    proc.createDataObjectFromSplit = createDataObjectFromSplit;
    proc.setData                   = setData;
    proc.getData                   = getData;
    proc.groups                    = groups;
    proc.privacyFilter = privacyFilter;

    //set public methods and vars.
    that.getSelf          = getSelf;
    that.getGroup         = getGroup;
    that.getNetwork       = getNetwork;
    that.getFormattedData = getFormattedData;


    return that;
}

module.exports = {ResultManager: ResultManager};