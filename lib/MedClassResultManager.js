'use strict';
var logger = require('./logger').Logger('MedClassResultManager', 2); //#TODO: set logger to level 1 when done!
var groups = require('./groups');
var util   = require('util');
var ResultManager = require("./ResultManager").ResultManager;
var request = require('request');
var async   = require('async');

function MedClassResultManager( id, data, proc ){

    proc = proc || {};  

    proc.regexString = '^([a-zA-Z0-9]+)_(.+)_(.+)$';

    var that = ResultManager(id, data, proc);


    var createDataObjectFromSplit = function(matches){

        return {
            code : matches[1],
            codeSystem : matches[2],
            clinician : matches[3]
        };

    };

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

        classes = classes.slice(classes.length-10, classes.length); //return the top 10


        for( var i = 0; i < classes.length; i ++ ){

            toReturn.push(classes[i].class); 

        }

        return toReturn; 

    }


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

        toReturn.sort(function(a , b ){

            return a.count - b.count; 

        });

        return toReturn; 


    }

    var generateResult = function(input, next){

        var finalResult = { 'processed_result' : [], "provider_id" : id }; 

        logger.success(util.inspect(input));

        var networkResults  = reduceByDrugClass(that.getNetwork());
        var groupResults    = reduceByDrugClass(that.getGroup()); 
        var selfResults     = reduceByDrugClass(that.getSelf()); 

        //sorts so that the last element in the array is the largest.
        var topTenClasses   = findTopTenClasses(selfResults);

        logger.warn(util.inspect(topTenClasses));

        networkResults  = filterByMedClass(networkResults, topTenClasses);
        groupResults    = filterByMedClass(groupResults, topTenClasses);
        selfResults     = filterByMedClass(selfResults, topTenClasses);

        logger.info(util.inspect(networkResults));
        logger.warn(util.inspect(groupResults));
        logger.error(util.inspect(selfResults));


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