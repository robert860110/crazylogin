/**
 * index.js
 * OpenIDConnect provider
 * Based on OAuth 2.0 provider by Amir Malik
 *
 * @author Agustín Moyano
 */

var querystring = require('querystring'),
    crypto = require('crypto'),
    extend = require('extend'),
    url = require('url'),
    Q = require('q'),
    jwt = require('jwt-simple'),
    util = require("util"),
    base64url = require('base64url');


module.exports = function(db) {

    return {
        auth: function(req, res, next) {
            Q(querystring.parse(url.parse(req.url).query)).then(function(params) {
                    //Check if response_type is supported and client_id is valid.
                    var deferred = Q.defer();
                    switch (params.response_type) {
                        case 'none':
                        case 'code':
                        case 'token':
                        case 'id_token':
                            break;
                        default:
                            //var error = false;
                            var sp = params.response_type.split(' ');
                            sp.forEach(function(response_type) {
                                if (['code', 'token', 'id_token'].indexOf(response_type) == -1) {
                                    throw { type: 'error', uri: params.redirect_uri, error: 'unsupported_response_type', msg: 'Response type ' + response_type + ' not supported.' };
                                }
                            });
                    }
                    db.Client.findOne({ client_id: params.client_id }, function(err, client) {
                        if (err || !client || model === '') {
                            deferred.reject({ type: 'error', uri: params.redirect_uri, error: 'invalid_client', msg: 'Client ' + params.client_id + ' doesn\'t exist.' });
                        } else {
                            req.session.client_id = client._id;
                            req.session.client_secret = client.client_secret;
                            deferred.resolve(params);
                        }
                    });

                    return deferred.promise;
                }).then(function(params) {
                    //Step 3: Check if scopes are valid, and if consent was given.

                    var deferred = Q.defer();
                    var reqsco = params.scope.split(' ');
                    req.session.scopes = {};
                    var promises = [];
                    db.Consent.findOne({ user: req.session.user, client: req.session.client_id }, function(err, consent) {
                        reqsco.forEach(function(scope) {
                            var innerDef = Q.defer();
                            if (!self.settings.scopes[scope]) {
                                innerDef.reject({ type: 'error', uri: params.redirect_uri, error: 'invalid_scope', msg: 'Scope ' + scope + ' not supported.' });
                            }
                            if (!consent) {
                                req.session.scopes[scope] = { ismember: false, explain: self.settings.scopes[scope] };
                                innerDef.resolve(true);
                            } else {
                                var inScope = consent.scopes.indexOf(scope) !== -1;
                                req.session.scopes[scope] = { ismember: inScope, explain: self.settings.scopes[scope] };
                                innerDef.resolve(!inScope);
                            }
                            promises.push(innerDef.promise);
                        });

                        Q.allSettled(promises).then(function(results) {
                            var redirect = false;
                            for (var i = 0; i < results.length; i++) {
                                if (results[i].value) {
                                    redirect = true;
                                    break;
                                }
                            }
                            if (redirect) {
                                req.session.client_key = params.client_id;
                                var q = req.path + '?' + querystring.stringify(params);
                                deferred.reject({ type: 'redirect', uri: self.settings.consent_url + '?' + querystring.stringify({ return_url: q }) });
                            } else {
                                deferred.resolve(params);
                            }
                        });
                    });

                    return deferred.promise;
                }).then(function(params) {
                    //Step 5: create responses
                    if (params.response_type == 'none') {
                        return { params: params, resp: {} };
                    } else {
                        var deferred = Q.defer();
                        var promises = [];

                        var rts = params.response_type.split(' ');

                        rts.forEach(function(rt) {
                            var def = Q.defer();
                            promises.push(def.promise);
                            switch (rt) {
                                case 'code':
                                    var createToken = function() {
                                        var token = crypto.createHash('md5').update(params.client_id).update(Math.random() + '').digest('hex');
                                        req.model.auth.findOne({ code: token }, function(err, auth) {
                                            if (!auth) {
                                                setToken(token);
                                            } else {
                                                createToken();
                                            }
                                        });
                                    };
                                    var setToken = function(token) {
                                        req.model.auth.create({
                                            client: req.session.client_id,
                                            scope: params.scope.split(' '),
                                            user: req.session.user,
                                            sub: req.session.sub || req.session.user,
                                            code: token,
                                            redirectUri: params.redirect_uri,
                                            responseType: params.response_type,
                                            status: 'created'
                                        }).exec(function(err, auth) {
                                            if (!err && auth) {
                                                setTimeout(function() {
                                                    req.model.auth.findOne({ code: token }, function(err, auth) {
                                                        if (auth && auth.status == 'created') {
                                                            auth.destroy();
                                                        }
                                                    });
                                                }, 1000 * 60 * 10); //10 minutes
                                                def.resolve({ code: token });
                                            } else {
                                                def.reject(err || 'Could not create auth');
                                            }
                                        });

                                    };
                                    createToken();
                                    break;
                                case 'id_token':
                                    var d = Math.round(new Date().getTime() / 1000);
                                    //var id_token = {
                                    def.resolve({
                                        id_token: {
                                            iss: req.protocol + '://' + req.headers.host,
                                            sub: req.session.sub || req.session.user,
                                            aud: params.client_id,
                                            exp: d + 3600,
                                            iat: d,
                                            nonce: params.nonce
                                        }
                                    });
                                    //def.resolve({id_token: jwt.encode(id_token, req.session.client_secret)});
                                    break;
                                case 'token':
                                    var createToken = function() {
                                        var token = crypto.createHash('md5').update(params.client_id).update(Math.random() + '').digest('hex');
                                        req.model.access.findOne({ token: token }, function(err, access) {
                                            if (!access) {
                                                setToken(token);
                                            } else {
                                                createToken();
                                            }
                                        });
                                    };
                                    var setToken = function(token) {
                                        var obj = {
                                            token: token,
                                            type: 'Bearer',
                                            expiresIn: 3600,
                                            user: req.session.user,
                                            client: req.session.client_id,
                                            scope: params.scope.split(' ')
                                        };
                                        req.model.access.create(obj, function(err, access) {
                                            if (!err && access) {
                                                setTimeout(function() {
                                                    access.destroy();
                                                }, 1000 * 3600); //1 hour

                                                def.resolve({
                                                    access_token: obj.token,
                                                    token_type: obj.type,
                                                    expires_in: obj.expiresIn
                                                });
                                            }
                                        });
                                    };
                                    createToken();
                                    break;
                            }
                        });

                        Q.allSettled(promises).then(function(results) {
                            var resp = {};
                            for (var i in results) {
                                resp = extend(resp, results[i].value || {});
                            }
                            if (resp.access_token && resp.id_token) {
                                var hbuf = crypto.createHmac('sha256', req.session.client_secret).update(resp.access_token).digest();
                                resp.id_token.at_hash = base64url(hbuf.toString('ascii', 0, hbuf.length / 2));
                                resp.id_token = jwt.encode(resp.id_token, req.session.client_secret);
                            }
                            deferred.resolve({ params: params, type: params.response_type != 'code' ? 'f' : 'q', resp: resp });
                        });

                        return deferred.promise;
                    }
                })
                .then(function(obj) {
                    var params = obj.params;
                    var resp = obj.resp;
                    var uri = url.parse(params.redirect_uri, true);
                    if (params.state) {
                        resp.state = params.state;
                    }
                    if (params.redirect_uri) {
                        if (obj.type == 'f') {
                            uri.hash = querystring.stringify(resp);
                        } else {
                            uri.query = resp;
                        }
                        res.redirect(url.format(uri));
                    }
                })
                .fail(function(error) {
                    if (error.type == 'error') {
                        self.errorHandle(res, error.uri, error.error, error.msg);
                    } else {
                        res.redirect(error.uri);
                    }
                });
        }
    };

};
