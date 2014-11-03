'use strict';
var async = require('async'),
    _ = require('lodash'),
    logger = require('./logger');

function devroutes(callback, data) {
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
                console.log(req.body);
                models.query.create(req.body, function (err) {
                    if (err) { return res.send(err); }
                    res.send('Got it!');
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
                    res.send('Got it!');
                });
            });
        });

    // Attach the router to `/dev`
    data.httpd.use('/dev', router);
    callback(null, router);
}

module.exports = [ 'models', 'httpd', devroutes ];
