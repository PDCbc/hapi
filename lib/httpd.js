'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger').Logger('httpd', 1);

var morgan = require('morgan'); 
var colors = require('cli-color');

/**
 * Create and configure the express server.
 * @param  {Function} next The async callback.
 * @param  {Object}   data Contains the results of `environment`.
 */
function httpd(next, data) {
    var server = require('express')();
    // Set the server engine.
    server.set('view engine', 'hbs');
    // Middleware (https://github.com/senchalabs/connect#middleware)
    // Ordering ~matters~.
    // Logger

    morgan.token('path', function getPath(req){

        return req.url.replace(/\?.*/i, "");

    });

    morgan.token('mydate', function getMyDate(req){
        return logger.getDate();
    });

    server.use(morgan(colors.magenta.bold('\\n [:method] :mydate :path - :status')));
    // Parses Cookies
    server.use(require('cookie-parser')(process.env.SECRET));
    // Parses bodies.
    server.use(require('body-parser').urlencoded({ extended: true }));
    server.use(require('body-parser').json());
    // Session store
    server.use(require('express-session')({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true }
    }));
    // Protects against CSRF.
    // server.use(require('csurf')());
    // Compresses responses.
    server.use(require('compression')());
    return next(null, server);
}

// This module depends on the `environment` task.
module.exports = [ 'environment', httpd ];
