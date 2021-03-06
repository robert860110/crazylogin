/**
 * Author: Guanqun Bao 6-17-2016
 * Email: guanqun.bao@gmail.com
 */

// Module dependencies
var express = require('express'),
    url = require('url'),
    jwt = require('jwt-simple'),
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

    if (req.session.user && req.session.authorize_url) {
        return res.redirect(req.session.authorize_url);
    } else if (!req.session.user && req.session.authorize_url) {

        var body = _.pick(req.body, 'phone_number', 'password');
        // test a matching password
        db.Passcode.findOne({ phone_number: body.phone_number }, function(err, passcode) {
            if (err || !passcode) {
                req.session.error = 'Authentication failed, please check your username and password.';
                //console.log(req.session);
                return res.status(401).json(err);
            }
            // test a matching password
            passcode.comparePassword(body.password, function(err, isMatch) {
                if (err || !isMatch) {
                    req.session.error = 'Your username and password are not match.';
                    //console.log(req.session);
                    return res.status(401).json(err);
                }
                db.User.findOne({ phone_number: passcode.phone_number }, function(err, user) {
                    if (err || !user) {
                        req.session.error = 'Access denied!';
                        //console.log(req.session);
                        return res.status(401).json(err);
                    }
                    // req.session.regenerate(function() {
                    //     req.session.user = user._id;
                    //     req.session.success = 'Authenticated as ' + user.phone_number;
                    //     console.log(req.session);
                    //     console.log(req.session.authorize_url);
                    //     return res.redirect(req.session.authorize_url);
                    //     //return res.redirect('/consent');
                    // });

                    req.session.user = user._id;
                    req.session.success = 'Authenticated as ' + user.phone_number;
                    return res.redirect(req.session.authorize_url);
                });
            });
        });
    }
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
                    req.session.user = user;
                    req.session.success = 'Authenticated as ' + user.phone_number + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                    return res.redirect(req.session.authorize_url);
                });
            });
        }
    });
});



// Create authorize endpoint
app.get('/users/authorize', function(req, res) {
    var reqParameters = querystring.parse(url.parse(req.url).query);
    req.session.authorize_url = req.url;
    if (!req.session.user) {
        return res.redirect('/users/login');
    }

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
                    req.session.redirect_uri = reqParameters.redirect_uri;
                    req.session.client_secret = client.client_secret;

                    console.log('clientid: ' + req.session.client_id);
                    console.log('user: ' + req.session.user);

                    db.Consent.findOne({ client: client._id, user: req.session.user }).exec(function(err, consent) {
                        if (err) {
                            return res.status(400).send('Internal Error');
                        } else if (!consent) {
                            return res.redirect('/users/consent');
                        } else {
                            // Gnerate Response
                            switch (reqParameters.response_type) {
                                case 'code':

                                    var authCode = crypto.createHash('md5').update(reqParameters.client_id).update(Math.random() + '').digest('hex');

                                    // db.Auth.findOne({ code: token }, function(err, auth) {
                                    //     if (!auth) {
                                    //         setToken(token);
                                    //     } else {
                                    //         createToken();
                                    //     }
                                    // });

                                    var newAuth = new db.Auth({
                                        client: req.session.client_id,
                                        scope: reqScope,
                                        user: req.session.user,
                                        sub: req.session.sub || req.session.user,
                                        code: authCode,
                                        redirectUri: reqParameters.redirect_uri,
                                        responseType: reqParameters.response_type,
                                        status: 'created'
                                    });

                                    console.log(newAuth);
                                    newAuth.isNew = true;


                                    newAuth.save(function(err, auth) {
                                        if (err) {
                                            return res.status(400).json(err);
                                        } else {
                                            setTimeout(function() {
                                                db.Auth.findOne({ code: authCode }, function(err, auth) {
                                                    if (auth && auth.status == 'created') {
                                                        auth.destroy();
                                                    }
                                                });
                                            }, 1000 * 60 * 10); //10 minutes
                                            // Redirect the user to client page with auth code
                                            return res.redirect(reqParameters.redirect_uri + '?' + 'code=' + auth.code);
                                        }
                                    });

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
    // var head = '<head><title>Consent</title></head>';
    // var lis = [];
    // for (var i in req.session.scope) {
    //     lis.push('<li><b>' + i + '</b>: ' + req.session.scope[i] + '</li>');
    // }
    // var ul = '<ul>' + lis.join('') + '</ul>';
    // var error = req.session.error ? '<div>' + req.session.error + '</div>' : '';
    // var body = '<body><h1>Consent</h1><form method="POST">' + ul + '<input type="submit" name="accept" value="Accept"/><input type="submit" name="cancel" value="Cancel"/></form>' + error;
    // res.send('<html>' + head + body + '</html>');
    res.sendFile(__dirname + '/public' + '/consent.html');
});

// User submit consent form
app.post('/users/consent', function(req, res) {

    var newConsent = new db.Consent({
        user: req.session.user,
        client: req.session.client_id,
        scope: req.session.scope
    });

    console.log(req.session);

    newConsent.save(function(err, consent) {
        if (err) {
            return res.json(err);
        } else {
            console.log(consent);
            return res.redirect(req.session.authorize_url);
        }
    });

});

// Parse authorization header
function parse_authorization(authorization) {
    if (!authorization)
        return null;

    var parts = authorization.split(' ');

    if (parts.length != 2 || parts[0] != 'Basic')
        return null;

    var creds = new Buffer(parts[1], 'base64').toString(),
        i = creds.indexOf(':');

    if (i == -1)
        return null;

    var username = creds.slice(0, i);
    password = creds.slice(i + 1);

    return [username, password];
}

// Token endpoint
app.post('/users/token', function(req, res) {

    var client_id = req.body.client_id;
    var client_secret = req.body.client_secret;

    if (!client_id || !client_secret) {
        var authorization = parse_authorization(req.headers.authorization);
        if (authorization) {
            client_id = authorization[0];
            client_secret = authorization[1];
        }
    }
    if (!client_id || !client_secret) {
        return res.status(400).send('Missing client credentials found');
    } else {
        db.Client.findOne({ client_id: client_id, client_secret: client_secret }).exec(function(err, client) {
            if (err || !client) {
                return res.status(400).send('No matched client credentials are found');
            } else {
                var clientName = client.name;

                switch (req.body.grant_type) {
                    case 'authorization_code':
                        db.Auth.findOne({ code: req.body.code }).exec(function(err, auth) {
                            if (err || !auth) {
                                return res.status(400).send('auth error');
                            }
                            if (auth.responseType != 'code') {
                                return res.status(400).send('grant_type error');
                            }
                            if ((auth.redirectUri || req.body.redirect_uri) && auth.redirectUri != req.body.redirect_uri) {
                                return res.status(400).send('redirect_uri error');
                            }

                            /////////////////////////////////
                            // Generate token
                            /////////////////////////////////

                            var issueTime = Math.round(new Date().getTime() / 1000);
                            var id_token = {
                                iss: req.protocol + '://' + req.headers.host,
                                sub: auth.user || null,
                                aud: clientName,
                                exp: issueTime + 3600,
                                iat: issueTime
                            };
                            var token = crypto.createHash('md5').update(Math.random() + '').digest('hex');
                            var newAccess = new db.Access({
                                token: token,
                                type: 'Bearer',
                                expiresIn: 3600,
                                user: auth.user,
                                client: client._id,
                                idToken: jwt.encode(id_token, client_secret),
                                scope: auth.scope,
                                auth: auth._id || null
                            });
                            newAccess.save(function(err, access) {
                                if (err || !access) {
                                    return res.status(400).json(err);
                                } else {
                                    setTimeout(function() {
                                        access.destroy();
                                    }, 1000 * 3600); //1 hour

                                    return res.json({
                                        access_token: access.token,
                                        token_type: access.type,
                                        expires_in: access.expiresIn,
                                        id_token: access.idToken
                                    });
                                }

                            });

                        });
                        break;

                }
            }
        });
    }
});


// Userinfo endpoint
app.get('/api/userInfo', function(req, res) {

    var reqParameters = querystring.parse(url.parse(req.url).query);

    db.Access.findOne({ token: reqParameters.access_token }).exec(function(err, access) {

        console.log(access);

        if (!err && access) {
            db.User.findOne({ _id: access.user }).exec(function(err, user) {
                return res.json({
                    email: user.email,
                    phone: user.phone_number
                });
            });
        } else {
            return res.status(400).json(err);
        }
    });
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
