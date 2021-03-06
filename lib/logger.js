'use strict';
var colors = require('cli-color');


/*
 * Logger levels are:
 *   2 : DEBUG (log)
 *   1 : INFO, SUCCESS, WARN, ERROR
 *
 * Path is a string to display that is a module name
 */

function Logger(path, level) {

    level = level || 1;  //default to level 1

    path = path || "";

    var that = {};

    var getDateTime = function () {

        var d = new Date();
        return d.getFullYear() + "-" + d.getMonth() + 1 + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "." + d.getMilliseconds();

    };

    var prepareOutput = function (l, text, line) {

        var s = "\n";
        s += "[" + l + "]  ";
        s += getDateTime() + " ";
        s += path;
        if (line !== undefined) {

            s += ":" + line;

        }
        s += " : ";
        s += text;
        return s;

    };

    var info = function (text, line) {

        console.log(prepareOutput("INFO", text, line));

    };

    var log = function (text, line) {

        if (level > 1) {

            console.log(colors.white(prepareOutput("DEBUG", text, line)));

        }

    };

    var debug = function (text, line) {

        if (level > 1) {

            console.log(colors.white(prepareOutput("DEBUG", text, line)));

        }

    };

    var warn = function (text, line) {

        console.log(colors.yellow(prepareOutput("WARNING", text, line)));

    };

    var error = function (text, line) {

        console.log(colors.red(prepareOutput("ERROR", text, line)));

    };

    var success = function (text, line) {

        console.log(colors.green(prepareOutput("SUCCESS", text, line)));

    };


    that.info    = info;
    that.log     = log;
    that.debug   = debug;
    that.warn    = warn;
    that.error   = error;
    that.success = success;
    that.getDate = getDateTime;
    return that;

}


/**
 * A simple wrapper around `console` that uses colors.
 * @type {Object}
 */
module.exports = {Logger: Logger, DEBUG: 0, INFO: 1};
