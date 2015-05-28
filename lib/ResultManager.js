//result manager

var logger = require('./logger').Logger('ResultManager', 2); //#TODO: set logger to level 1 when done!
var groups = require('./groups');
var util   = require('util');


function ResultManager(id, data){

    var that = {}; 
    var proc = { data : data };

    var splitData   = null; 
    var selfData    = null; 
    var groupData   = null; 
    var networkData = null; 

    var getData = function(){

        //regular expression that matches three groups.
        var rex     = null;
        var matches = null; 

        //check to see if we have a cached result so that we don't have to 
        //repeat this split in the future
        if( splitData ){

            return splitData; 

        }else{

            //proc.splitData has form like:  
            //      [ { code : XXX, codeSystem: XXX, clinician : XXX, count : Number }, ... ]

            splitData = []; 

            for( var k in proc.data.aggregate_result ){

                matches = null; 

                //check that we haven't run up the prototype chain.
                if(!proc.data.aggregate_result.hasOwnProperty(k)){

                    continue; 

                }else{

                    rex     = new RegExp('^([a-zA-Z0-9]+)_(.+)_(.+)$','gi');
                    matches = rex.exec(k);

                    if ( !matches || matches.length != 4 ){

                        logger.debug("Could not appropriate match for "+k+" result was: "+util.inspect(matches)); 
                        continue;

                    }else{

                        splitData.push({
                            code : matches[1],
                            codeSystem : matches[2],
                            clinician : matches[3],
                            count : proc.data.aggregate_result[k]
                        });
                    }

                }

            }

            return splitData; 

        }

    };


    var getSelf = function(){

        if( selfData ){

            return selfData; 

        }else{

            var input       = getData(); 
            var toReturn    = []; 

            for( var i = 0; i < input.length ; i++ ){

                if( input[i].clinician === id ){

                    toReturn.push(input[i]);

                }

            }

            selfData = toReturn; 

            return toReturn; 

        }

    };

    var getGroup = function(){

        if ( groupData ){

            return groupData; 

        }else{

            var toReturn    = [];
            var input       = getData(); 
            var activeGroup = groups.findGroup(id); 

            for( var i = 0; i < input.length; i++ ){

                if( inGroup(input[i].clinician, activeGroup) ){

                    toReturn.push(input[i]);

                }

            }

            groupData = toReturn;
            return groupData; 

        }

    };

    var getNetwork = function(){

        return splitData; 

    };

    //set public methods and vars.
    that.getSelf    = getSelf;
    that.getGroup   = getGroup;
    that.getNetwork = getNetwork;


    return that; 
}

module.exports = { ResultManager : ResultManager }