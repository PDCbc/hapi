'use strict';

var async = require('async'),
    _ = require('lodash'),
    logger = require('./lib/logger');

async.auto({
    environment:     environment,
    database:        [ 'environment', database ],
    certificate:     [ 'environment', certificate ],
	httpd:           [ 'environment', httpd ],
    models:          [ 'database', models ],
    auth:            [ 'models', 'httpd', auth ],
    routes:          [ 'auth', 'models', 'httpd', routes ],
    devroutes:       [ 'auth', 'models', 'httpd', devroutes ],
    oauth:           [ 'models', 'httpd', oauth ]
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
		key:  function (next) { fs.readFile('cert/server.key', 'utf8', next); },
		cert: function (next) { fs.readFile('cert/server.crt', 'utf8', next); }
	}, function (error, results) {
		if (error) { generateCertificate(error, results, next); }
		else { return next(error, results); }
	});

	/**
	 * Detects if certs are missing and generates one if needed
	 * @param {Error|null}  error   - If `error` is non-null, generate a certificate, since one doesn't exist.
	 * @param {Object|null} results - Passed to `next`.
	 * @param {Function}    next    - The callback. Is passed `error` (if not a certificate error) and `results`.
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
    var server = require('express')(),
        passport = require('passport');
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
    // Passport middleware.
    server.use(passport.initialize());
    server.use(passport.session());
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
        user:         require('./models/user'),
        // OAuth
        consumer:     require('./models/consumer'),
        requestToken: require('./models/requestToken'),
        accessToken:  require('./models/accessToken'),
        // Data
        query:  require('./models/query'),
        result:  require('./models/result')
    });
}

function auth(callback, data) {
    var passport = require('passport'),
        LocalStrategy = require('passport-local'),
        user = data.models.user;
    passport.use(new LocalStrategy(
        function (username, password, done) {
            user.findOne({ username: username }).exec(function (error, identity) {
                if (error) { return done(error); }
                if (!identity) { return done(null, false); }
                identity.comparePassword(password, function (error, correct) {
                    if (error) { return done(error, null); }
                    if (!correct) { return done(null, false); }
                    return done(null, identity);
                });
            });
        }
    ));
    passport.serializeUser(function(user, done) {
        return done(null, user._id);
    });
    passport.deserializeUser(function(id, done) {
        user.findById(id, function (err, user) {
            return done(err, (user) ? user : false);
         });
    });
    return callback(null);
}

function routes(callback, data) {
    var router = new require('express').Router(),
        ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn,
        ensureLoggedOut = require('connect-ensure-login').ensureLoggedOut,
        passport = require('passport');
    // Create a User.
    router.get('/create',
        // ensureLoggedIn('/login'), // TODO: In production, this should be secured somehow.
        function (req, res) {
            return res.render('create', req.user);
        }
    );
    router.post('/create',
        // ensureLoggedIn('/login'),
        function create(req, res) {
            if (req.body.username && req.body.password) {
                var user = new data.models.user({
                    username: req.body.username,
                    password: req.body.password
                }).save(function (error) {
                    if (error) { return res.status(401).send('You didn\'t do it!'); }
                    return res.redirect('/login?good');
                });
            } else {
                return res.status(401).send('More info needed');
            }
        }
    );
    // Login a User.
    router.get('/login', function (req, res) {
        res.render('login', req.user);
    });
    router.post('/login',
        passport.authenticate('local', { successReturnToOrRedirect: '/success', failureRedirect: '/login?failure' })
    );
    // Log out.
    router.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/login');
    });
    // Other routes.
    router.get('/', function (req, res) {
        return res.send('Good!');
    });
    router.get('/success',
        ensureLoggedIn('/login'),
        function (req, res) {
            return res.render('success', req.user);
        }
    );

    // Attach the router.
    data.httpd.use(router);
    callback(null, router);
}

function devroutes(callback, data) {
    var router = new require('express').Router(),
        models = data.models,
        ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn,
        ensureLoggedOut = require('connect-ensure-login').ensureLoggedOut;

    // Show the form for adding a query.
    router.get('/query', function (req, res) {
        console.log('Derp Query');
        models.query.find().exec(function (err, queries) {
            if (err) { return res.send(err); }
            res.render('dev/query', { queries: queries });
        });
    });
    router.post('/query', function (req, res) {
        req.body.executions = []; // No executions right now.
        console.log(req.body);
        models.query.create(req.body, function (err) {
            if (err) { return res.send(err); }
            res.send('Got it!');
        });
    });

    // Show the form for adding a result.
    router.get('/result', function (req, res) {
        console.log('Derp Result');
        async.parallel({
            queries: function (callback) {
                models.query.find().exec(callback);
            },
            results: function (callback) {
                models.result.find().exec(callback);
            },
            endpoints: function (callback) {
                // TODO: Don't mock these.
                callback(null, [
                    {
                        _id: '12345678901234567890123a',
                        name: 'First'
                    },
                    {
                        _id: '12345678901234567890123b',
                        name: 'Second'
                    }
                ]);
            }
        }, function (err, results) {
            if (err) { return res.send(err); }
            return res.render('dev/result', results);
        });
    });
    router.post('/result', function (req, res) {
        // TODO: Use a schema validator.
        req.body.value = JSON.parse(req.body.value);
        console.log(req.body);
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

function oauth(callback, data) {
    var passport = require('passport'),
        crypto = require('crypto'),
        ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn,
        ConsumerStrategy = require('passport-http-oauth').ConsumerStrategy,
        TokenStrategy = require('passport-http-oauth').TokenStrategy,
        models = data.models;
    function generateToken(length) {
        return crypto.randomBytes(length / 2).toString('hex');
    }
    // https://github.com/jaredhanson/oauthorize/blob/8ef21f5283c4cc81328a2acd7f99bb64c03b2252/examples/express2/auth.js#L48
    passport.use('consumer', new ConsumerStrategy(
        function consumerCallback(consumerKey, done) {
            // TODO: Same as one below.
            models.consumer.findOne({ key: consumerKey }).exec(function (err, consumer) {
                if (err) { return done(err); }
                if (!consumer) { return done(null, false); }
                return done(null, consumer, consumer.secret);
            });
        },
        function tokenCallback(requestToken, done) {
            models.requestToken.findOne({ identifier: requestToken }).exec(function (err, token) {
                if (err) { return done(err); }
                if (!token) { return done(null, false); }
                var info = {
                    verifier: token.verifier,
                    consumer: token.consumer,
                    user: token.user,
                    approved: token.approved
                };
                done(null, token.secret, info);
            });
        },
        function validateCallback(timestamp, nonce, done) {
            // TODO: Implement Timestamp and Nonce.
            done(null, true);
        }
    ));
    passport.use('token', new TokenStrategy(
        function consumerCallback(consumerKey, done) {
            // TODO: Same as the one above.
            models.consumer.findOne({ identifier: consumerKey }).exec(function (err, consumer) {
                if (err) { return done(err); }
                if (!consumer) { return done(null, false); }
                return done(null, consumer, consumer.secret);
            });
        },
        function verifyCallback(accessToken, done) {
            models.accessToken.findOne({ identifier: accessToken }).populate('user').exec(function (err, token) {
                if (err) { return done(err); }
                if (!token || !token.user) { return done(null, false); }
                // TODO: Use Scopes.
                var info = { scope: '*' };
                done(null, token.user, token.secret, info);
            });
        },
        function validateCallback(timestamp, nonce, done) {
            console.log("Validate callback called");
            // TODO: Implement Timestamp and Nonce.
            done(null, true);
        }
    ));
    // Endpoints
    var router = new require('express').Router(),
        provider = require('oauthorize').createServer();

    provider.serializeClient(function(client, done) {
        return done(null, client._id);
    });
    provider.deserializeClient(function(id, done) {
        models.consumer.findById(id, function (err, client) {
            return done(err, (client) ? client : false);
         });
    });

    // NOTE: Oauthorize is not smart about handling nested routers. We ~MUST~ declare the entire route.
    router.get('/oauth/authorize',
        ensureLoggedIn(),
        provider.userAuthorization(function (requestToken, done) {
            models.requestToken.findOne({ identifier: requestToken }).populate('consumer').exec(function (err, token) {
                if (err) { return done(err); }
                return done(null, token.consumer, token.callback);
            });
        }),
        function dialog(req, res) {
            res.render('authorize', { transactionID: req.oauth.transactionID, user: req.user, consumer: req.oauth.client });
        }
    );
    router.post('/oauth/authorize',
        ensureLoggedIn(),
        // TODO: Use Scopes.
        provider.userDecision(function (requestToken, user, res, done) {
            var verifier = generateToken(8);
            // Approve a token.
            models.requestToken.findOne({ identifier: requestToken }).exec(function (err, token) {
                if (err) { return done(err); }
                token.user = user;
                token.verifier = verifier;
                token.approved = true;
                token.save(function (err) {
                    return done(err, verifier);
                });
            });
        }),
        function (req, res) { console.log(req.oauth); }
    );
    router.post('/oauth/request_token',
        // TODO: Security considerations. (Limited Lifetime)
        passport.authenticate('consumer', { session: false }),
        provider.requestToken(function (consumer, callbackURL, done) {
            var token = generateToken(8),
                secret = generateToken(32);
            models.requestToken.create({ identifier: token, secret: secret, consumer: consumer, callback: callbackURL },
                function (err) {
                    if (err) { return done(err); }
                    return done(null, token, secret);
                });
        })
    );
    router.post('/oauth/access_token',
        // TODO: Security considerations.
        passport.authenticate('consumer', { session: false }),
        provider.accessToken(function (requestToken, verifier, info, done) {
            return done(null, (verifier === info.verifier) ? true : false);
        },
        function (consumer, requestToken, info, done) {
            if (!info.approved) { return done(null, false); }
            // Need to cast.
            if (String(consumer._id) !== String(info.consumer)) { return done(null, false); }
            var token = generateToken(16),
                secret = generateToken(64);
            models.accessToken.create({ identifer: token, secret: secret, user: info.user, consumer: info.consumer },
                function (err) {
                    if (err) { return done(err); }
                    return done(null, token, secret);
                });
        })
    );
    // Finish up
    data.httpd.use(router);
    callback(null, router);
}

function complete(error, data) {
    if (error) { logger.error(error); throw error; }
    // No errors
    require('https').createServer(data.certificate, data.httpd).listen(process.env.PORT, function () {
        logger.success('Server listening on port ' + process.env.PORT);
    });
}
