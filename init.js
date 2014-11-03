'use strict';

var async = require('async'),
    _ = require('lodash'),
    logger = require('./lib/logger');

async.auto({
    environment:  environment,
    database:     [ 'environment', database ],
    certificate:  [ 'environment', certificate ],
    httpd:        [ 'environment', httpd ],
    models:       [ 'database', models ],
    routes:       [ 'models', 'httpd', routes ],
    devroutes:    [ 'models', 'httpd', devroutes ],
}, complete);

function environment(callback) {
    if (!process.env.SECRET) {
        logger.warn('No $SECRET present. Generating a temporary random value.');
        process.env.SECRET = require('crypto').randomBytes(256);
    }
    if (!process.env.PORT) {
        logger.warn('No $PORT present. Choosing a sane default, 8080.');
        process.env.PORT = 8080;
    }
    if (!process.env.MONGO_URI) {
        logger.warn('No $MONGO_URI present. Defaulting to `mongodb://localhost/auth`.');
        process.env.MONGO_URI = 'mongodb://localhost/auth';
    }
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== 0) {
        logger.warn('The application set set to reject any non-CA signed Certs. To allow, set NODE_TLS_REJECT_UNAUTHORIZED = 0');
    }
    return callback(null);
}

/**
 * Setup the SSL Certificates.
 * @param {Function} next - The callback.
 */
function certificate(next) {
    var fs = require('fs');
    // Get the certificates.
    async.auto({
        key:    function (next) { fs.readFile('./cert/server.key', 'utf8', next); },
        cert: function (next) { fs.readFile('./cert/server.crt', 'utf8', next); }
    }, function (error, results) {
        if (error) { generateCertificate(error, results, next); }
        else { return next(error, results); }
    });

    /**
     * Detects if certs are missing and generates one if needed
     * @param {Error|null}    error     - If `error` is non-null, generate a certificate, since one doesn't exist.
     * @param {Object|null} results - Passed to `next`.
     * @param {Function}        next        - The callback. Is passed `error` (if not a certificate error) and `results`.
     */
    function generateCertificate(error, results, next) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Tell Node it's okay.
        if (error && error.code === 'ENOENT') {
            logger.warn('No certificates present in `cert/{server.key, server.crt}`. Generating a temporary certificate.');
            require('pem').createCertificate({ days: 1, selfSigned: true }, function formatKey(error, keys) {
                if (error) { return next(error, null); }
                return next(null, {key: keys.serviceKey, cert: keys.certificate });
            });
        } else {
            return next(error, results);
        }
    }
}

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

function database(callback, data) {
    var connection = require('mongoose').connect(process.env.MONGO_URI).connection;
    connection.on('open', function () {
        logger.log('Connected to database on ' + process.env.MONGO_URI);
        return callback(null);
    });
    connection.on('error', function (error) {
        return callback(error, connection);
    });
}

function models(callback, data) {
    return callback(null, {
        user:                 require('./models/user'),
        // OAuth
        consumer:         require('./models/consumer'),
        requestToken: require('./models/requestToken'),
        accessToken:    require('./models/accessToken'),
        // Data
        query:    require('./models/query'),
        result:    require('./models/result')
    });
}

function auth(callback, data) {
    logger.error("Auth not implemented yet");
    return callback(null);
}

function routes(callback, data) {
    var router = new require('express').Router();
    // Create a User.
    router.route('/user')
        .get(
            function (req, res, next) { logger.error("Auth not implemented yet"); },
            function (req, res) {
                return res.render('create', req.user);
            }
        )
        .post(
            function(req, res, next) { logger.error("Auth Not implemented yet"); },
            function create(req, res) {
                if (req.body.username && req.body.password) {
                    var user = new data.models.user({
                        username: req.body.username,
                        password: req.body.password
                    }).save(function (error) {
                        if (error) { return res.status(401).send('You didn\'t do it!'); }
                        return res.redirect('/auth?good');
                    });
                } else {
                    return res.status(401).send('More info needed');
                }
            }
        );


    // Login a User.
    router.route('/auth')
        .get(function (req, res) {
            res.render('login', req.user);
        })
        .post(function (req, res) {
            logger.error("Auth not implemented yet.");
        });
    // Log out.
    router.get('/auth/logout', function (req, res) {
        logger.error("Auth Not implemented yet.");
        res.redirect('/auto');

    });

    // A list of valid items to visualize.
    router.get('/api',
        //function (req, res, next) { logger.error("Auth not implemented yet"); next(); },
        function (req, res) {
            data.models.query.find({}, "-_id title description").exec(function (err, data) {
                if (err) { return res.send(err); }
                res.json({ visualizations: data });
            });
        }
    );

    // The information, data, and meta-information for the specified item.
    router.get('/api/:title',
        function (req, res, next) { logger.error("Auth Not implemented yet."); next(); },
        function (req, res) {
            data.models.query.findOne({ title: req.params.title }).populate('executions').exec(function (err, data) {
                if (err) { return res.send(err); }
                // Prepare a response in the given format.
                var item = {
                    //_id: data._id,
                    title: data.title,
                    description: data.description,
                    data: {},
                    meta: {
                        user_id: data.user_id || null,
                        map: data.map || null,
                        filter: data.filter || null,
                        reduce: data.reduce || null
                    }
                };
                // Populate the data section. Pluck only the values.
                item.data.json = _.chain(data.executions)
                    .where({ status: 'complete' }) // Make sure it's complete.
                    .pluck('value')
                    .reduce(function reduce(result, item) {
                        // Get the keys, map over them.
                        _.keys(item).map(function map(key) {
                            // Make sure the key exists in the results otherwise we get an error.
                            if (!result[key]) {
                                result[key] = [];
                            }
                            // Push the result. Returning is not necessary.
                            result[key].push(item[key]);
                        });
                        return result; // Return the result into the reduce.
                    }, {})
                    .value(); // Pull the value out of the chain.
                res.json(item);
            });
        }
    );

    // Attach the router.
    data.httpd.use(router);
    callback(null, router);
}

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

function complete(error, data) {
    if (error) { logger.error(error); throw error; }
    // No errors
    require('https').createServer(data.certificate, data.httpd).listen(process.env.PORT, function () {
        logger.success('Server listening on port ' + process.env.PORT);
    });
}
