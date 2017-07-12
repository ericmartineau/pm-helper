var _ = require('lodash');

(function(scope, rq, gl, evs) {
    'use strict';

    var ctx;

    var _postman;

    if (!scope.postman) {
        throw { message: 'No valid postman instance found' };
    } else if (scope.postman.myPostman && scope.postman.myPostman()) {
        throw { message: 'Already been created' };
    } else {
        _postman = scope.postman;
    }

    const _request = rq;
    const _envs = evs;

    const CTXKEY = '__pmh:data';
    const MAPS = 'maps';
    const TOCX = 'toclear:';
    const SCRIPTDEPS = 'scriptdeps';
    const PROVIDES = 'provides:';
    const PROVIDERS = 'providers:';

    function myPostman() {
        return _postman;
    }

    function setEnvironmentVariable(name, val) {
        // Register this property as one to clean on any dependents
        _postman._priorSetEnvironmentVariable(name, val);
        __providerOf(name);
        __clearDeps(name);
    }

    function verifyHelper(parent, child) {
        tests['Should have set child'] = _envs[child];

        this.setEnvironmentVariable(parent, 'New Val');
        return tests['Should have cleared child'] = !_envs[child];
    }

    function requireVars(n) {
        n = n instanceof Array ? n : [n];

        __scriptDeps(_request.id, n);
        n.forEach(function(reqVar) {
            if (!_envs[reqVar]) {
                throw { message: 'Missing env variable \'' + reqVar + '\'.  Set it manually, or run one of: ' + __list(PROVIDERS, reqVar)};
            }
        });
    }

    function clearHelperVariables() {
        _postman.clearGlobalVariable(CTXKEY);
    }

    ////// PRIVATE STUFF

    function __providerOf(prop) {
        console.log('Adding "' + _request.name + '" as provider of ' + prop);
        __list(PROVIDES, _request.id, [prop]);
        __list(PROVIDERS, prop, [_request.name]);

        // Registering variable deleter.  Find my dependencies and tell them to remove my props
        // when they are cleared.
        const dependsOn = __scriptDeps(_request.id);
        if (dependsOn) {
            dependsOn.forEach(function(dependency) {
                __list(TOCX, dependency, [prop]);
            });
        }
    }

    function __save() {
        console.log(__ctx());
        _postman.setGlobalVariable(CTXKEY, JSON.stringify(__ctx()));
    }

    function __ctx(prop) {
        ctx = ctx || JSON.parse(_postman.getGlobalVariable(CTXKEY) || '{}');
        if (prop) return ctx[prop] = ctx[prop] || {};
        else return ctx;
    }

    function __scriptDeps(scriptId, deps) {
        const allDeps = __ctx(SCRIPTDEPS);
        if (scriptId && deps) {
            allDeps[scriptId] = deps;
            __save();
        }
        else if (scriptId) return allDeps[scriptId];
        else return allDeps;
    }

    function __clearDeps(prop, done) {
        if (!done) done = [];
        var cxlist = __list(TOCX, prop);
        cxlist.forEach(__cxvar(prop));

        if (_.difference(done, cxlist).length > 0) {
            done = _.union(done, cxlist);
            cxlist.forEach(function(cx) {
                __clearDeps(cx, done);
            })
        }
    }

    function __cxvar(p) {
        return function(v) {
            console.log('Clearing var ' + v + ' because parent ' + p + ' was updated');
            tests['Clearing var ' + v + ' because parent ' + p + ' was updated'] = true;
            _postman.clearEnvironmentVariable(v);
        }
    }

    function __list(type, prop, append) {
        const key = __key(type, prop);
        const list = _.union(__ctx(MAPS)[key] || [], append);

        __ctx(MAPS)[key] = _.without(_.uniq(list), prop);
        if (append) __save();
        return list;
    }

    function __key(type, prop) {
        return type + prop;
    }

    const mixin = {
        _priorSetEnvironmentVariable: _postman.setEnvironmentVariable,
        myPostman: myPostman,
        requireVars: requireVars,
        setEnvironmentVariable: setEnvironmentVariable,
        verifyHelper: verifyHelper,
        clearHelperVariables: clearHelperVariables
    };

    if(!_postman._priorSetEnvironmentVariable) {
        _.assign(_postman, mixin);
    }

    scope.myPostman = _postman;

    return function(callback) {
        if(typeof callback === 'function') {
            callback.apply(scope, [_postman]);
        } else if(callback instanceof Array) {
            _postman.requireVars(callback);
        } else if(typeof callback === 'string') {
            _postman.requireVars(callback);
        } else {
            throw {'message': 'Unknown type passed, must be function, array, or string'}
        }


    };
})(this, request, globals, environment);
