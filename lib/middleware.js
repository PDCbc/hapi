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

  function verifyRequestMatchesSession(req, res, next){
    console.log('Demographic route req.query: '+ util.inspect( req.query, false, null ));
    console.log('Demographic route req.query.cookie: ' + util.inspect( req.query.cookie, false, null));
    var cookie = req.query.cookie;

    auth.verifyAuth( cookie,
      function(err, body){
        if (err)
        {
          logger.error('Problem contacting auth server: '+ err);
          res.status(500).json({'error':err});
          return;
        }
        else if(body.clinic !== req.params.clinic && body.clinician !== req.params.clinician)
        {
          logger.success('body.clinic: ' + body.clinic);
          logger.warn('req.params.clinic: ' + req.params.clinic);
          logger.error('*****************');
          logger.success('body.clinician: ' + body.clinician);
          logger.warn('req.params.clinician: ' + req.params.clinician);

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
    verifyRequestMatchesSession: verifyRequestMatchesSession
  });

}

// This task depends on the `environment` task.
module.exports = ['environment', middleware];
