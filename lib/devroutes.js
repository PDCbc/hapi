'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

/**
 * This task sets up the developer routes for the application.
 * @param  {Function} next The async callback. Signature (error, result)
 * @param  {Object}   data async object which contains the results of `models` and `httpd`
 */
function devroutes(next, data) {
    var router = new require('express').Router(),
            models = data.models;

    // Show the form for adding a query.
    router.route('/query')
        .get(function (req, res) {
            models.query.find().exec(function (err, queries) {
                    if (err) { return res.send(err); }
                    res.render('dev/query', { queries: queries });
            });
        })
        .post(function (req, res) {
            req.body.executions = []; // No executions right now.
                models.query.create(req.body, function (err) {
                    if (err) { return res.send(err); }
                    return res.send('Got it!');
                });
        });

    // Show the form for adding a result.
    router.route('/result')
        .get(function (req, res) {
            async.parallel({
                queries: function (callback) { models.query.find().exec(callback); },
                results: function (callback) { models.result.find().exec(callback); },
                endpoints: function (callback) {
                        // TODO: Don't mock these.
                        callback(null, [
                                { _id: '12345678901234567890123a', name: 'First' },
                                { _id: '12345678901234567890123b', name: 'Second' }
                        ]);
                }
            }, function (err, results) {
                    if (err) { return res.send(err); }
                    return res.render('dev/result', results);
            });
        })
        .post(function (req, res) {
            // TODO: Use a schema validator.
            req.body.value = JSON.parse(req.body.value);
            models.result.create(req.body, function (err, result) {
                if (err) { return res.send(err); }
                models.query.findByIdAndUpdate(req.body.query_id, {
                    $push: {
                        executions: result._id
                    }
                }, function (err) {
                    if (err) { return res.send(err); }
                    return res.send('Got it!');
                });
            });
        });

    // Show the form for adding a visualization.
    router.route('/visualization')
        .get(function (req, res) {
            async.parallel({
                queries: function (callback) { models.query.find().exec(callback); },
                visualizations: function (callback) { models.visualization.find().exec(callback); }
            }, function (err, results) {
                if (err) { return res.send(err); }
                return res.render('dev/visualization', results);
            });
        })
        .post(function (req, res) {
            models.visualization.create({
                query: req.body.query,
                script: req.body.script
            }, function (err) {
                if (err) { return res.send(err); }
                return  res.send('Got it!');
            });
        });

    // Attach the router to `/dev`
    data.httpd.use('/dev', router);
    next(null, router);
}

module.exports = [ 'models', 'httpd', devroutes ];
