//result manager

var logger = require('./logger').Logger('ResultManager', 2); //#TODO: set logger to level 1 when done!
var groups = require('./groups');


function ResultManager(id, data){

    var that = {}; 
    var proc = {};

    var getSelf = function(){

        return {}; 
    }

    var getGroup = function(){

        return {};
    }

    var getNetwork = function(){

        return {}; 
    }

    //set public methods and vars.
    that.getSelf    = getSelf;
    that.getGroup   = getGroup;
    that.getNetwork = getNetwork;


    //set protected methods and vars.


    return that; 
}