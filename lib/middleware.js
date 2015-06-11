'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger').Logger("middleware", 1);

var util = require('util'),
    auth = require('./auth');
/**
 * Middleware for requests to the hubapi.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data async object which contains the results of `validators`
 */
function middleware(next, data) {

    function verifyAuth(req, res, next){

        try{

            var cookie = req.query.cookie;

            auth.verifyAuth( cookie,

                function(err, body){

                    try{ //nest try/catch required to handle async javascript behavior.

                        if ( err && err !== 200 && err !== 204 ){

                            switch( err ){

                                case 400:
                                    logger.error("400: Invalid request was sent to auth.verifyAuth, caused 400 error.");
                                    res.status(400);
                                    res.json(null);
                                    break;
                                case 401: 
                                    logger.error("401: Verification via auth.verifyAuth failed! The cookie was invalid, caused 401 error.");
                                    res.status(401);
                                    res.json(null); 
                                    break;
                                case 404: 
                                    logger.error("404: auth.verifyAuth could not communicate with the auth component, caused 404 error.");
                                    res.status(404);
                                    res.json(null); 
                                    break; 
                                case 500:
                                    logger.error("500: A server error occurred, caused 500 error");
                                    res.status(500);
                                    res.json(null); 
                                    break;
                                default:
                                    break;

                            }

                        }else{

                            if ( body ){

                                req.session.user = body;
                                next();

                            }else{

                                logger.error("500: Result from auth.verifyAuth was not valid. Returning 500.");
                                res.status(500);
                                res.json(null);
                                return;
                            }
                            

                        }

                    }catch(e){

                        logger.error("500: middleware.verifyAuth caught an exception: "+ util.inspect(e, false, null));
                        res.status(500);
                        res.json(null);
                        return;

                    }

                }

           );

        }catch(e){ //catch any errors that may arise from auth.verifyAuth

            logger.error("500: middleware.verifyAuth caught an exception: "+ util.inspect(e, false, null));
            res.status(500);
            res.json(null);
            return;

        }

    }

  next(null, {

    verifyAuth: verifyAuth,

  });

}

// This task depends on the `environment` task.
module.exports = ['environment', middleware];
