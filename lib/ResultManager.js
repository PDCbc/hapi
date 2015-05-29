'use strict';
var logger = require('./logger').Logger('ResultManager', 2); //#TODO: set logger to level 1 when done!
var groups = require('./groups');
var util   = require('util');


function ResultManager( id, data, proc ){

    var that = {}; 

    //set up the protected variables for this object.
    proc = proc || {};
    proc.data = data; 

    var splitData   = null; 
    var selfData    = null; 
    var groupData   = null; 
    var networkData = null; 

    var createDataObjectFromSplit = function(matches){

        throw {

            name : "UnimplementedMethodError",
            message : "The method ResultManager.createDataObjectFromSplit is an abstract method that must be implemented by a sub-object."

        };
        return;

    }

    var getData = function(){

        //regular expression that matches three groups.
        var rex     = null;
        var matches = null; 

        //check to see if we have a cached result so that we don't have to 
        //repeat this split in the future
        if( splitData ){

            return splitData; 

        }else{

            if( !proc.regexString ){
                throw {
                    name : "UndefinedAttributeError",
                    message : "The attribute proc.regexString is required to be set by any sub-object of ResultManager."
                };
                return;
            }

            //proc.splitData has form like:  
            //      [ { code : XXX, codeSystem: XXX, clinician : XXX, count : Number }, ... ]

            splitData = []; 

            for( var k in proc.data.aggregate_result ){

                matches = null; 

                //check that we haven't run up the prototype chain.
                if(!proc.data.aggregate_result.hasOwnProperty(k)){

                    continue; 

                }else{

                    rex     = new RegExp(proc.regexString,'gi');
                    matches = rex.exec(k);

                    if ( !matches || matches.length != 4 ){

                        logger.debug("Could not appropriate match for "+k+" result was: "+util.inspect(matches)); 
                        continue;

                    }else{

                        var o = proc.createDataObjectFromSplit(matches);
                        o.count = proc.data.aggregate_result[k];
                        splitData.push(o);

                    }

                }

            }

            return splitData; 

        }

    };


    var getSelf = function(input){

        var input       = getData(); 
        var toReturn    = []; 

        for( var i = 0; i < input.length ; i++ ){

            if( input[i].clinician === id ){

                toReturn.push(input[i]);

            }

        }

        selfData = toReturn; 

        return toReturn; 

    };

    var getGroup = function(){

        var toReturn    = [];
        var input       = getData(); 
        var activeGroup = groups.findGroup(id); 

        for( var i = 0; i < input.length; i++ ){

            if( groups.inGroup(input[i].clinician, activeGroup) ){

                toReturn.push(input[i]);

            }

        }

        groupData = toReturn;
        return groupData; 

    };

    var getNetwork = function(){

        if( splitData ){

            return splitData; 

        }else{

            splitData = getData();
            return splitData; 

        }

    };


   var getFormattedData = function(){

         throw { 

            name : "UnimplementedMethodError",
            message : "The method ResultManager.getFormattedNetworkData is an abstract method that must be implemented by a sub-object."

        };

    }

    //protected methods
    proc.createDataObjectFromSplit  = createDataObjectFromSplit; 

    //set public methods and vars.
    that.getSelf                    = getSelf;
    that.getGroup                   = getGroup;
    that.getNetwork                 = getNetwork;
    that.getFormattedData           = getFormattedData; 


    return that; 
}

module.exports = { ResultManager : ResultManager }