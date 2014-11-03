'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function httpd(callback, data) {
    var server = require('express')();
    // Set the server engine.
    server.set('view engine', 'hbs');
    // Middleware (https://github.com/senchalabs/connect#middleware)
    // Ordering ~matters~.
    // Logger
    server.use(require('morgan')('dev'));
    // Parses Cookies
    server.use(require('cookie-parser')(process.env.SECRET));
    // Parses bodies.
    server.use(require('body-parser').urlencoded({ extended: true }));
    server.use(require('body-parser').json());
    // Session store
    server.use(require('express-session')({
        secret: process.env.SECRET,
        cookie: { secure: true }
    }));
    // Protects against CSRF.
    // server.use(require('csurf')());
    // Compresses responses.
    server.use(require('compression')());
    return callback(null, server);
}

module.exports = [ 'environment', httpd ];
