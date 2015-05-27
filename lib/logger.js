'use strict';
var colors = require('cli-color');


/*
* Logger levels are:  
*   0 : DEBUG (log)
*   1 : INFO, SUCCESS, WARN, ERROR
* 
* Path is a string to display that is a module name
*/

function Logger(path, level){

  level = level || 1;  //default to level 1

  path = path || "";

  var that = {}; 

  var getDateTime = function(){

    var d = new Date();
    return d.getFullYear()+"-"+d.getMonth()+1+"-"+d.getDate()+" "+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"."+d.getMilliseconds();

  }

  var prepareOutput = function(l, text){

    var s = "\n";
    s += "["+l+"]  ";
    s += getDateTime() +" "; 
    s += path + " : "; 
    s += text; 
    return s;

  }

  var info = function(text){

      console.log(prepareOutput("INFO", text));

  }

  var log = function(text) {

    if( level < 1){

      console.log(colors.white(prepareOutput("DEBUG", text)));

    }

  }

  var debug = function(text){

   if( level < 1){

      console.log(colors.white(prepareOutput("DEBUG", text)));

    }

  }

  var warn = function(text) {

      console.log(colors.yellow(prepareOutput("WARNING",text)));

  }

  var error = function(text) {

      console.log(colors.red(prepareOutput("ERROR",text)));

  }

  var success = function(text) {

      console.log(colors.green(prepareOutput("SUCCESS",text)));

  }


  that.info     = info; 
  that.log      = log; 
  that.debug    = debug; 
  that.warn     = warn;
  that.error    = error;
  that.success  = success; 
  that.getDate  = getDateTime;
  return that;

}


/**
 * A simple wrapper around `console` that uses colors.
 * @type {Object}
 */
module.exports = { Logger : Logger , DEBUG : 0, INFO : 1};
