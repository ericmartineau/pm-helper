var _ = require('lodash');

/**
 *
 */
const _postman = postman;
const _request = request;
const _globals = globals;

const _pm = _.assign({}, _postman);
_pm.setEnvironmentVariable = function(name, val) {
    // Register this property as one to clean on any dependents
    _postman.setEnvironmentVariable(name, val);
    this.registerAsProvider(name);
};

_pm.requireEnv = function(n) {
    n = n instanceof Array ? n : [n];

    this.saveScriptDependencies(_request.id, n);
    n.forEach(function(reqVar) {
        if (!_postman.getGlobalVariable(reqVar)) {
            // throw { message: 'Missing env variable \'' + n + '\'.  Set it manually, or run one of: ' };
        }
    });

};

_pm.clearHelperVariables = function() {
    _globals.forEach(function(g) {
        if(g.indexOf('__pmh:') === 0) {
            _postman.clearGlobalVariable(g);
        }
    });
};

const PREFIX = '__pmh:';
const ENVDEP = 'envdep:';
const SCRIPTDEPS = PREFIX + 'scriptdeps';
const PROVIDER = 'provider:';

_pm.verifyHelper = function() {
    // Add sanity check to load things up.
    return true;
};

_pm.registerAsProvider = function(prop) {
    console.log('Adding ' + _request.name + ' as provider of ' + prop);
    this.addToList(_request.id, PROVIDER, [prop]);

    // Registering variable clearer
    const dependencies = this.getScriptDependencies()[_request.id];
    const self = this;
    if(dependencies) {
        dependencies.forEach(function(dependency) {
            self.addToList(dependency, ENVDEP, [prop]);
        });
    }
};

_pm.isHelping = function() {
    return true;
};

_pm.getScriptDependencies = function() {
    const existing = _postman.getGlobalVariable(SCRIPTDEPS);
    return existing ? JSON.parse(existing) : {};
};

_pm.saveScriptDependencies = function(scriptId, dependencies) {
    const allDeps = this.getScriptDependencies();
    allDeps[scriptId] = dependencies;
    _postman.setGlobalVariable(SCRIPTDEPS, JSON.stringify(allDeps));
};

_pm.getList = function(type, prop) {
    const key = this.createKey(type, prop);
    const existing = _postman.getGlobalVariable(key);
    var list = [];
    if (existing) {
        list = JSON.parse(existing);
    }
    return list;
};

_pm.createKey = function(type, prop) {
    return PREFIX + type + prop;
};

_pm.addToList = function(v, type, props) {
    const self = this;
    props.each(function(prop) {
        const list = self.getList(type, v);
        list.push(prop);
        const key = self.createKey(type, v);
        _postman.setGlobalVariable(key, JSON.stringify(list));
    });
};

_pm;
