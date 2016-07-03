/**
 * Author: Guanqun Bao 6-17-2016
 * Email: guanqun.bao@gmail.com
 */

// Module dependencies
var express = require('express'),
    url = require('url'),
    _ = require('underscore'),
    crypto = require('crypto'),
    expressSession = require('express-session'),
    querystring = require('querystring'),
    logger = require('morgan'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    db = require('./models.js'),
    twilio = require('twilio'),
    twilioClient = new twilio.RestClient('AC9c68ea35aee62e08292acd2bcfcf49b6', '938c9c574f9939b1736da9b1a3345c3c');

// Create express application
var app = express();
var PORT = process.env.PORT || 3000;

app.set('PORT', PORT);
app.use(logger('dev'));
app.use(bodyParser());
app.use(expressSession({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'shhhh, very secret'
}));
app.use(express.static(__dirname + '/public'));

// Define scopes

var scopes = ['openid', 'profile', 'email', 'address', 'phone', 'offline_access'];
var response_types = ['code', 'token', 'id_token'];


//////////////////////////////////////////
// Application route
//////////////////////////////////////////

// Send a One Time Password to user's phone number through SMS
app.post('/sendCode', function(req, res) {

    var body = _.pick(req.body, 'phone_number');

    if (body.hasOwnProperty('phone_number')) {

        var password = Math.floor(100000 + Math.random() * 900000);

        db.Passcode.findOne({
            phone_number: body.phone_number
        }).exec(function(err, passcode) {
            if (err) {
                return res.status(400).json(err);
            } else if (!passcode) {
                // if no record found, create a new MDN->OTP record
                var newPasscode = new db.Passcode({
                    password: password.toString(),
                    phone_number: body.phone_number.toString()
                });
                newPasscode.save(function(err, passcode) {
                    if (err) {
                        return res.status(400).json(err);
                    } else {
                        twilioClient.sms.messages.create({
                            to: body.phone_number,
                            from: '+1 408-359-4157',
                            body: 'Your confirmation code is:' + password + '. (Valid for 10 mins)'
                        }, function(err, message) {
                            if (!err) {
                                return res.json(passcode);
                            } else {
                                return res.status(400).json(err);
                            }
                        });
                    }
                });

            } else {
                // if an existing record is found, update the existing MDN->OTP record
                passcode.password = password.toString();

                passcode.save(function(err, passcode) {
                    if (err) {
                        return res.status(400).json(err);
                    } else {
                        twilioClient.sms.messages.create({
                            to: body.phone_number,
                            from: '+1 408-359-4157',
                            body: 'Your confirmation code is:' + password + '. (Valid for 10 mins)'
                        }, function(err, message) {
                            if (!err) {
                                return res.json(passcode);
                            } else {
                                return res.status(400).json(err);
                            }
                        });
                    }
                });
            }
        });
    } else return res.status(400).send('error');
});


// Redirect to login page
app.get('/', function(req, res) {
    res.redirect('/users/login');
});

// Load login form 
app.get('/users/login', function(req, res, next) {
    // var head = '<head><title>Login</title></head>';
    // var inputs = '<input type="text" name="phone_number" placeholder="Enter phone number"/><br><input type="password" name="password" placeholder="Enter Password"/>';
    // var error = req.session.error ? '<div>' + req.session.error + '</div>' : '';
    // var body = '<body><h1>Login</h1><form method="POST">' + inputs + '<input type="submit"/></form>' + error;
    // res.send('<html>' + head + body + '</html>');
    res.sendFile(__dirname + '/public' + '/login.html');
});

// Authenticate user using phone number and SMS!
app.post('/users/login', function(req, res) {

    delete req.session.error;
    delete req.session.success;

    var body = _.pick(req.body, 'phone_number', 'password');
    // test a matching password
    db.Passcode.findOne({ phone_number: body.phone_number }, function(err, passcode) {
        if (err || !passcode) {
            req.session.error = 'Authentication failed, please check your username and password.';
            console.log(req.session);
            return res.status(401).json(err);
        }
        // test a matching password
        passcode.comparePassword(body.password, function(err, isMatch) {
            if (err || !isMatch) {
                req.session.error = 'Your username and password are not match.';
                console.log(req.session);
                return res.status(401).json(err);
            }
            db.User.findOne({ phone_number: passcode.phone_number }, function(err, user) {
                if (err || !user) {
                    req.session.error = 'Access denied!';
                    console.log(req.session);
                    return res.status(401).json(err);
                }
                req.session.regenerate(function() {
                    req.session.user = user._id;
                    req.session.success = 'Authenticated as ' + user.phone_number;
                    console.log(req.session);
                    return res.json(user);
                    //return res.redirect('/consent');
                });
            });
        });
    });
});

// Create a new user account
app.post('/users', function(req, res) {
    var body = _.pick(req.body, 'email', 'phone_number', 'password');
    console.log('body: ' + JSON.stringify(body));

    db.Passcode.findOne({ phone_number: body.phone_number }, function(err, passcode) {
        if (err || !passcode) {
            req.session.error = 'Authentication failed, please check your username and password.';
            res.status(401).json(err);
        } else {
            // test a matching password
            passcode.comparePassword(body.password, function(err, isMatch) {
                if (err || !isMatch) {
                    console.log('not match');
                    req.session.error = 'Your username and password are not match.';
                    return res.status(401).json(err);
                }
                var newUser = new db.User({
                    email: body.email,
                    phone_number: body.phone_number
                });
                newUser.save(function(err, user) {
                    if (err || !user) {
                        req.session.error = 'Your account can not be created.';
                        return res.status(401).json(err);
                    }
                    req.session.regenerate(function() {
                        req.session.user = user;
                        req.session.success = 'Authenticated as ' + user.phone_number + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                        return res.redirect('/consent');
                    });
                });
            });
        }
    });
});



// Create authorize endpoint
app.get('/users/authorize', function(req, res) {
    var reqParameters = querystring.parse(url.parse(req.url).query);

    if (reqParameters.hasOwnProperty('client_id', 'redirect_uri', 'response_type', 'scope')) {

        var reqScope = reqParameters.scope.split(" ");
        var isScopeValid = reqScope.every(function(val) {
            return scopes.indexOf(val) >= 0;
        });

        if (!isScopeValid) {
            return res.status(400).send('scope is not valid');
        } else if (response_types.indexOf(reqParameters.response_type) < 0) {
            return res.status(400).send('unsupported_response_type: ' + reqParameters.response_type);
        }

        // Check client_id, redirect_uri and scope
        db.Client.findOne({
                client_id: reqParameters.client_id
            })
            .exec(function(err, client) {
                if (err || !client) {
                    return res.status(400).send('Invalid client_id');
                } else {

                    if (client.redirect_uris.indexOf(reqParameters.redirect_uri) < 0) {
                        return res.status(400).send('Invalid redirect_uri');
                    }

                    req.session.client_id = client._id;
                    req.session.scope = reqScope;
                    req.session.client_secret = client.client_secret;

                    db.Consent.findOne({ client_id: client.client_id, user: req.session.user }).exec(function(err, consent) {
                        if (err) {
                            return res.status(400).send('Internal Error');
                        } else if (!consent) {
                            // var newConsent = new db.Consent({
                            //     user: req.session.user,
                            //     client: req.session.client_id,
                            //     scope: reqScope
                            // });
                            return res.redirect('/users/consent');
                        } else {
                            // Gnerate Response
                            switch (reqParameters.response_type) {
                                case 'code':
                                    var createToken = function() {
                                        var token = crypto.createHash('md5').update(reqParameters.client_id).update(Math.random() + '').digest('hex');
                                        db.Auth.findOne({ code: token }, function(err, auth) {
                                            if (!auth) {
                                                setToken(token);
                                            } else {
                                                createToken();
                                            }
                                        });
                                    };
                                    var setToken = function(token) {
                                        var newAuth = new db.Auth({
                                            client: req.session.client_id,
                                            scope: reqScope,
                                            user: req.session.user,
                                            sub: req.session.sub || req.session.user,
                                            code: token,
                                            redirectUri: reqParameters.redirect_uri,
                                            responseType: reqParameters.response_type,
                                            status: 'created'
                                        }).exec(function(err, auth) {
                                            if (!err && auth) {
                                                setTimeout(function() {
                                                    db.Auth.findOne({ code: token }, function(err, auth) {
                                                        if (auth && auth.status == 'created') {
                                                            auth.destroy();
                                                        }
                                                    });
                                                }, 1000 * 60 * 10); //10 minutes
                                                // Redirect the user to client page with auth code
                                                return res.redirect(reqParameters.redirect_uri + auth.code);
                                            } else {
                                                return res.status(400).send('Can not create auth code');
                                            }
                                        });

                                    };
                                    createToken();
                                    break;

                                case 'id_token':

                            }



                        }

                    });


                    console.log(client);
                    // return res.json(client);
                }
            });

    } else return res.status(400).send('Missing request parameters');

});


// Render user consent form
app.get('/users/consent', function(req, res, next) {
    var head = '<head><title>Consent</title></head>';
    var lis = [];
    for (var i in req.session.scope) {
        lis.push('<li><b>' + i + '</b>: ' + req.session.scope[i] + '</li>');
    }
    var ul = '<ul>' + lis.join('') + '</ul>';
    var error = req.session.error ? '<div>' + req.session.error + '</div>' : '';
    var body = '<body><h1>Consent</h1><form method="POST">' + ul + '<input type="submit" name="accept" value="Accept"/><input type="submit" name="cancel" value="Cancel"/></form>' + error;
    res.send('<html>' + head + body + '</html>');
});

// User submit consent form
app.post('/users/consent', function(req, res) {


});


// Create a client
app.post('/client/register', function(req, res) {

    delete req.session.error;

    var body = _.pick(req.body, 'name', 'redirect_uris');

    var sha256_1 = crypto.createHash('sha256');
    sha256_1.update(body.name);
    body.client_id = sha256_1.digest('hex');

    var sha256_2 = crypto.createHash('sha256');
    sha256_2.update(Math.random().toString());
    body.client_secret = sha256_2.digest('hex');

    var newClient = new db.Client({
        name: body.name,
        client_id: body.client_id,
        //client_id: req.session.client_id,
        client_secret: body.client_secret,
        //client_secret: req.session.client_secret,
        redirect_uris: body.redirect_uris,
        user: req.session.user
    });

    newClient.save(function(err, client) {
        if (err || !client) {
            return res.status(401).json(err);
        } else return res.json(client);
        // return res.redirect('/client/' + client._id);
    });
});



app.listen(PORT, function() {
    console.log('Express listening on port ' + PORT + '!');
});
