'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

var util = require('util'),
    auth = require('./auth');
/**
 * Middleware for requests to the hubapi.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data async object which contains the results of `validators`
 */
function middleware(next, data) {

  function verifyAuth(req, res, next)
  {
    var cookie = req.query.cookie;

    auth.verifyAuth( cookie,
      function(err, body)
      {
        if(err)
        {

          logger.warn("middleware.verifyAuth:");
          logger.warn(req.baseUrl);
          logger.warn(cookie);

          logger.error('Problem with authentication: ' + err);
          res.status(500).json({'error': err});
          return;
        }
        else
        {
          req.session.user = body;
          next();
        }
      });
  }

  function verifyRequestMatchesSession(req, res, next){
    var cookie = req.query.cookie;

    auth.verifyAuth( cookie,
      function(err, body){
        if (err)
        {
          logger.error('Problem with authentication: '+ err);
          res.status(500).json({'error':err});
          return;
        }
        else if(body.clinic !== req.params.clinic && body.clinician !== req.params.clinician)
        {
          var forbiddenError = 'you do not have permission to view this data';
          res.status(403).json({'error':forbiddenError});
          return;
        }
        else
        {
          next();
        }
      }
    );
  }

  next(null, {
    verifyAuth: verifyAuth,
    verifyRequestMatchesSession: verifyRequestMatchesSession
  });

}

// This task depends on the `environment` task.
module.exports = ['environment', middleware];
