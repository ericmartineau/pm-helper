var _ = require('lodash');

/**
 *
 */
const _postman = postman;
const _request = request;
const _globals = globals;
const _envs = environment;

const _pm = _.assign({}, _postman);
_pm.setEnvironmentVariable = function(name, val) {
    // Register this property as one to clean on any dependents
    _postman.setEnvironmentVariable(name, val);
    this.__providerOf(name);
    this.__clearDeps(name);
};

const CTXKEY = '__pmh:data';
const MAPS = 'maps';
const TOCX = 'toclear:';
const SCRIPTDEPS = 'scriptdeps';
const PROVIDER = 'provider:';
var pmhCtx;


_pm.verifyHelper = function(parent, child) {
    tests['Should have set child'] = _envs[child];

    this.setEnvironmentVariable(parent, 'New Val');
    return tests['Should have cleared child'] = !_envs[child];
};

_pm.requireVars = function(n) {
    n = n instanceof Array ? n : [n];

    this.__scriptDeps(_request.id, n);
    n.forEach(function(reqVar) {
        if (!_envs[reqVar]) {
            throw { message: 'Missing env variable \'' + n + '\'.  Set it manually, or run one of: ' };
        }
    });

};

_pm.clearHelperVariables = function() {
    _postman.clearGlobalVariable(CTXKEY);
};

////// PRIVATES

_pm.__providerOf = function(prop) {
    console.log('Adding "' + _request.name + '" as provider of ' + prop);
    this.__list(_request.id, PROVIDER, [prop]);

    // Registering variable clearer.  Find my dependencies and tell them to remove my props
    // when they are cleared.
    const dependsOn = this.__scriptDeps(_request.id);
    const self = this;
    if (dependsOn) {
        dependsOn.forEach(function(dependency) {
            self.__list(TOCX, dependency, [prop]);
        });
    }
};

_pm.isHelping = function() {
    return true;
};

_pm.__save = function() {
    console.log(this.__ctx());
    _postman.setGlobalVariable(CTXKEY, JSON.stringify(this.__ctx()));
};

_pm.__ctx = function(prop) {
    pmhCtx = pmhCtx || JSON.parse(_postman.getGlobalVariable(CTXKEY) || "{}");
    if (prop) return pmhCtx[prop] = pmhCtx[prop] || {};
    else return pmhCtx;
};

_pm.__scriptDeps = function(scriptId, deps) {
    const allDeps = this.__ctx(SCRIPTDEPS);
    if (scriptId && deps) {
        allDeps[scriptId] = deps;
        this.__save();
    }
    else if (scriptId) return allDeps[scriptId];
    else return allDeps;
};

_pm.__clearDeps = function(prop, done) {
    if(!done) done=[];
    var cxlist = this.__list(TOCX, prop);
    cxlist.forEach(this.__cxvar(prop));

    if(_.difference(done, cxlist).length > 0) {
        done = _.union(done, cxlist);
        cxlist.forEach(function(cx) { this.__clearDeps(cx, done); })
    }
};

_pm.__cxvar = function(p) {
    return function(v) {
        console.log('Clearing var ' + v + ' because parent ' + p + ' was updated');
        tests['Clearing var ' + v + ' because parent ' + p + ' was updated'] = true;
        _postman.clearEnvironmentVariable(v);
    }
};


_pm.__list = function(type, prop, append) {
    const key = this.__key(type, prop);
    const list = _.union(this.__ctx(MAPS)[key] || [], append);

    this.__ctx(MAPS)[key] = _.without(_.uniq(list), prop);
    if (append) this.__save();
    return list;
};

_pm.__key = function(type, prop) {
    return CTXKEY + type + prop;
};

_pm;
