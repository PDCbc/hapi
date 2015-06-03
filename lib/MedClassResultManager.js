'use strict';
var logger = require('./logger').Logger('MedClassResultManager', 1); 
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
function MedClassResultManager( id, data, proc ){

    proc = proc || {};  

    //set the string that is used to split map/reduce results into
    //relevant pieces. 
    //Looks for: 
    //  PROVIDER_CODESYSTEM_CODE
    proc.regexString = '^([a-zA-Z0-9]+)_(.+)_(.+)$';

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
    *   { "code" : "XXXX", "codeSystem" : "XXXX", "clinician" : "XXXX" }
    */
    var createDataObjectFromSplit = function(matches){

        if ( !matches || matches.length !== 4 ){

            logger.debug("Parameter matches was invalid input to MedClassResultManager.createDataObjectFromSplit()");
            return null; 

        }

        return {
            code : matches[1],
            codeSystem : matches[2],
            clinician : matches[3]
        };

    };

    /** 
    * Applies a reduction to the data in the input parameter 
    * based on the drug class name. 
    * 
    * @param input {Array} - An array of objects. Each object represents a single line of map/reduce 
    *   output from the query. Array has structure like:
    *   [ { codeSystem : "XXX", clinician : "XXXX", count: X, class: "XXXX" }, .... ]
    * 
    * @return {Object} - An object that has the count for each drug class. Has structure like: 
    *   { "CLASS_1" : X, "CLASS_2" : Y, ... }
    */
    var reduceByDrugClass = function(input){

        var toReturn = {  };  // { class: "XXX" count: XXX } 

        //loop over all values
        for ( var i = 0; i < input.length; i++ ){

            //means we have found a drug class that is already in the 
            // the toReturn object
            if( Object.keys(toReturn).indexOf(input[i].class) >= 0 ){

                toReturn[input[i].class] += input[i].count;

            }else{

                toReturn[input[i].class] = input[i].count;

            }

        }

        return toReturn; 

    }

    /**
    * Finds the top 10 drug classes in the input data. 
    * 
    * @param input {Object} -  An object where the keys are drug classes and 
    *   values are the number of drugs that were prescribed. Has structure like:
    *   { "CLASS_1" : X, "CLASS_2" : Y, ... }
    *
    * @return {Array} - An array of the names of the top 10 drug classes:
    *   Has structure like: [ "CLASS_1", "CLASS_2", ... ] The top class is 
    *   the last one in the array.
    */
    var findTopTenClasses = function(input){

        var classes = []; 
        var toReturn = [];

        for( var k in input ){

            if( !input.hasOwnProperty(k) ){

                continue; 

            }

            classes.push({"class":k, "count": input[k]});

        }

        classes.sort(function(a , b ){

            return a.count - b.count; 

        });

        //get the last 10 values in the array, these are the top 10
        //last value is the top class.
        classes = classes.slice(classes.length-10, classes.length);

        for( var i = 0; i < classes.length; i ++ ){

            toReturn.push(classes[i].class); 

        }

        return toReturn; 

    }

    /**
    * Filters the input to return only classes that are within 
    * the array of medication classes provided.
    * 
    * @param input {Object} -  An object where the keys are drug classes and 
    *   values are the number of drugs that were prescribed. Has structure like:
    *   { "CLASS_1" : X, "CLASS_2" : Y, ... }
    * @param classes {Array} - An array of classes that we are filtering against.
    *   
    * @return - A filtered array containing only medications that are in the 
    *   classes array. Structure of the returned array is like:
    *   [ { "class" : "XX", "count" : X }, ... ]
    */
    var filterByMedClass = function(input, classes){

        var toReturn = []; 

        for( var k in input ){

            if( !input.hasOwnProperty(k) ){
                continue; 
            }

            if( classes.indexOf(k) > -1 ){

                toReturn.push({ "class": k, "count": input[k] }); 

            }

        }

        //sort the result before we return it. 
        toReturn.sort(function(a , b ){

            return a.count - b.count; 

        });

        return toReturn; 


    }

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

    var combineDataSets = function( selfData, groupData, networkData, totals ){

        var toReturn = []; 

        var tmpClass = null; 
        var tmpObj   = {}

        for( var s = selfData.length - 1; s >= 0; s-- ){

            tmpObj = {}; 
            tmpClass = selfData[s].class;

            tmpObj["drug_name"] = tmpClass; 
            tmpObj["agg_data"] = []; 

            for( var i = 0; i < groupData.length; i++ ){

                if( groupData[i].class === tmpClass ){

                    tmpObj["agg_data"].push({
                        "set" : "group",
                        "numerator" : groupData[i].count,
                        "denominator" : totals.group
                    });
                    break;

                }

            }

            for( var i = 0; i < networkData.length; i++ ){

                if( networkData[i].class === tmpClass ){

                    tmpObj["agg_data"].push({
                        "set" : "network",
                        "numerator" : networkData[i].count,
                        "denominator" : totals.network
                    }); 
                    break; 

                }
                
            }

            tmpObj["agg_data"].push({
                    "set" : "clinician",
                    "numerator" : selfData[s].count,
                    "denominator" : totals.self
            }); 

            toReturn.push(tmpObj);
        }

        return toReturn; 


    }

    var generateResult = function(input, next){

        var finalResult = { 'processed_result' : {} , "provider_id" : id }; 

        var networkResults  = reduceByDrugClass(that.getNetwork());
        var groupResults    = reduceByDrugClass(that.getGroup()); 
        var selfResults     = reduceByDrugClass(that.getSelf()); 

        var networkTotal    = getTotal(networkResults);
        var groupTotal      = getTotal(groupResults);
        var selfTotal       = getTotal(selfResults);

        //sorts so that the last element in the array is the largest.
        var topTenClasses   = findTopTenClasses(selfResults);

        networkResults  = filterByMedClass(networkResults, topTenClasses);
        groupResults    = filterByMedClass(groupResults, topTenClasses);
        selfResults     = filterByMedClass(selfResults, topTenClasses);

        var data = combineDataSets(
            selfResults, 
            groupResults, 
            networkResults, 
            {network: networkTotal, group: groupTotal, self: selfTotal } 
        );

        finalResult["processed_result"].drugs = data; 
        finalResult["processed_result"].time  = 

        next(finalResult);

    }

    var getDrugClasses = function(drugs, next){

        async.eachSeries(
            drugs, 
            function(item, callback){
                lookUpDrugCode(item, callback);
            },function(err){

                if( err ){
                    logger.error(err);
                }

                next(err); 
            }
        );

    }

    var getFormattedData = function(next){

        getDrugClasses(that.getNetwork(), function(err){


            if ( err ){

                next(null);

            }else{

                generateResult(that.getNetwork(), next);

            }


        }); 


    }

    var lookUpDrugCode = function(drug, next){

        if ( !drug || !next ){

            throw new Error("MedClassResultManager.lookUpDrugCode(drug, next) requires all three parameters"); 
            next("Error");
            return;
        }

        if ( !drug.code || !drug.codeSystem ){

            logger.warn("lookUpDrugCode() got a drug without a drug.code or drug.codeSystem: "+util.inspect(drug));
            next("Error");
            return; 

        }

        var path = '';  
        if ( drug.codeSystem.toLowerCase() === "hc-din" ){

            path = '/classbydin';

        }else if( drug.codeSystem.toLowerCase() === 'whoatc'){

            path = '/classbyatc';

        }else{

            //error case.
            next("Could not find mapping for code system: "+drug.codeSystem);

        }

        request.get(
            { url : process.env.DCLAPI_URI+path+"/"+drug.code, json: true},
            function ( error, res, body ){

                if ( error ){

                    var m = "Request to: "+process.env.DCLAPI_URI+"/"+path+"/"+drug.code+" failed with error: "+error;
                    logger.error(m);
                    next(m)

                }else if( res.statusCode !== 200 ){

                    var m = "Request to: "+process.env.DCLAPI_URI+"/"+path+"/"+drug.code+" failed with response code: "+res.statusCode;
                    logger.error(m);
                    next(m);
                    return;

                }else{

                    drug.class = body.class;

                    next();

                    return;

                }
                
            }
        );

    }

    //add protected functions here. 
    proc.createDataObjectFromSplit  = createDataObjectFromSplit;
    proc.lookUpDrugCode             = lookUpDrugCode; //make me protected later.

    //add public functions here.
    that.getFormattedData    = getFormattedData; 


    return that; 

}

module.exports = { MedClassResultManager : MedClassResultManager }