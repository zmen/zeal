/* jshint globalstrict: true */
/* global module: false */
/* global require: false */
/* global clearTimeout: false */
/* global setTimeout: false */
/* global console: false */
"use strict";

var _ = require("lodash");
require("../src/angular");

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$phase = null;
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    this.$$children = [];
    this.$root = this;
    this.$$listeners = {};
}

function initWatchVal() { }

function noop() { }

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return newValue === oldValue ||
            (typeof newValue === "number" && typeof oldValue === "number" &&
                isNaN(newValue) && isNaN(oldValue));
    }
}

Scope.prototype.$watch = function (watcherFn, listenerFn, valueEq) {
    var self = this;
    var watch = {
        watcherFn: watcherFn,
        listenerFn: listenerFn || noop,
        valueEq: !!valueEq,
        last: initWatchVal
    };
    this.$$watchers.unshift(watch);
    this.$root.$$lastDirtyWatch = null;

    return function () {
        var index = self.$$watchers.indexOf(watch);
        if (index > -1) {
            self.$$watchers.splice(index, 1);
            self.$root.$$lastDirtyWatch = null;
        }
    };
};

Scope.prototype.$$digestOnce = function () {

    var dirty;
    var continueLoop = true;

    var self = this;
    this.$$everyScope(function (scope) {
        var newValue, oldValue;
        _.forEachRight(scope.$$watchers, function (watcher) {
            try {
                if (watcher) {
                    newValue = watcher.watcherFn(scope);
                    oldValue = watcher.last;
                    if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                        self.$root.$$lastDirtyWatch = watcher;
                        watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
                        watcher.listenerFn(newValue,
                            (oldValue === initWatchVal ? newValue : oldValue),
                            scope
                        );
                        dirty = true;
                    } else if (self.$root.$$lastDirtyWatch == watcher) {
                        continueLoop = false;
                        return false;
                    }
                }
            } catch (e) {
                console.log(e);
            }
        });
        return continueLoop;
    });

    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty;
    var ttl = 10;
    this.$root.$$lastDirtyWatch = null;
    this.$beginPhase("$digest");

    if (this.$root.$$applyAsyncId) {
        clearTimeout(this.$root.$$applyAsyncId);
        this.$$flushApplyAsync();
    }

    do {
        while (this.$$asyncQueue.length) {
            try {
                var asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } catch (e) {
                console.error(e);
            }
        }

        dirty = this.$$digestOnce();
        if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
            this.$clearPhase();
            throw "10 digest iterations reached";
        }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();

    while (this.$$postDigestQueue.length) {
        try {
            this.$$postDigestQueue.shift()();
        } catch (e) {
            console.error(e);
        }
    }
};

Scope.prototype.$eval = function (exp, arg) {
    return exp(this, arg);
};

Scope.prototype.$apply = function (exp) {
    this.$beginPhase("$apply");
    try {
        return this.$eval(exp);
    } finally {
        this.$clearPhase();
        this.$root.$digest();
    }
};

Scope.prototype.$evalAsync = function (expr) {
    var self = this;
    if (!self.$$phase && !self.$$asyncQueue.length) {
        setTimeout(function () {
            if (self.$$asyncQueue.length) {
                self.$root.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({
        scope: this,
        expression: expr
    });
};

Scope.prototype.$beginPhase = function (phase) {
    if (this.$$phase) {
        throw this.$$phase + " already in progress";
    }
    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
};

Scope.prototype.$applyAsync = function (expr) {
    var self = this;
    self.$$applyAsyncQueue.push(function () {
        self.$eval(expr);
    });
    if (self.$root.$$applyAsyncId === null) {
        self.$root.$$applyAsyncId = setTimeout(function () {
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }

};

Scope.prototype.$$flushApplyAsync = function () {
    while (this.$$applyAsyncQueue.length) {
        try {
            this.$$applyAsyncQueue.shift()();
        } catch (e) {
            console.error(e);
        }
    }
    this.$root.$$applyAsyncId = null;
};

Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};

Scope.prototype.$watchGroup = function (watchFns, listenerFn) {
    var self = this;
    var newValues = new Array(watchFns.length);
    var oldValues = new Array(watchFns.length);
    var firstRun = true;

    if (watchFns.length === 0) {
        var shouldCall = true;
        self.$evalAsync(function () {
            if (shouldCall) {
                listenerFn(newValues, newValues, self);
            }
        });
        return function () {
            shouldCall = false;
        };
    }

    var changeReactionScheduled = false;

    function watchGroupListener() {
        if (firstRun) {
            firstRun = false;
            listenerFn(newValues, newValues, self);
        } else {
            listenerFn(newValues, oldValues, self);
        }
        changeReactionScheduled = false;
    }

    var destroyFunctions = _.map(watchFns, function (watchFn, i) {
        return self.$watch(watchFn, function (newValue, oldValue) {
            newValues[i] = newValue;
            oldValues[i] = oldValue;
            if (!changeReactionScheduled) {
                changeReactionScheduled = true;
                self.$evalAsync(watchGroupListener);
            }
        });
    });

    return function () {
        _.forEach(destroyFunctions, function (destroyFunction) {
            destroyFunction();
        });
    };
};

// Scope inheirence

Scope.prototype.$new = function (isolated, parent) {
    //it's ok to just use Object.create(this)
    //return Object.create(this);
    var child;
    parent = parent || this;
    if (isolated) {
        child = new Scope();
        child.$root = parent.$root;
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    } else {
        var ChildScope = function () { };
        ChildScope.prototype = this;
        child = new ChildScope();
    }
    child.$$watchers = [];
    child.$$children = [];
    child.$$listeners = {};
    child.$parent = parent;
    parent.$$children.push(child);
    return child;
};

Scope.prototype.$$everyScope = function (fn) {
    if (fn(this)) {
        return this.$$children.every(function (child) {
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
};

Scope.prototype.$destroy = function () {
    if (this.$parent) {
        var siblings = this.$$children;
        var indexOfThis = siblings.indexOf(this);
        if (indexOfThis >= 0) {
            siblings.splice(indexOfThis, 1);
        }
    }
    this.$$watchers = null;
};

// watchCollection

Scope.prototype.$watchCollection = function (watchFn, listenerFn) {
    var self = this;
    var newValue;
    var oldValue;
    var oldLength;
    var veryOldValue;
    var trackVaryOldValue = (listenerFn.length > 1);
    var changeCount = 0;
    var firstRun = true;

    var internalWatchFn = function (scope) {
        var newLength;
        newValue = watchFn(scope);

        if (_.isObject(newValue)) {
            if (_.isArrayLike(newValue)) {
                if (!_.isArray(oldValue)) {
                    changeCount++;
                    oldValue = [];
                }
                if (newValue.length != oldValue.length) {
                    changeCount++;
                    oldValue.length = newValue.length;
                }
                _.forEach(newValue, function (newItem, i) {
                    var bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]);
                    if (!bothNaN && newItem !== oldValue[i]) {
                        changeCount++;
                        oldValue[i] = newItem;
                    }
                });
            } else {
                if (!_.isObject(oldValue) || _.isArrayLike(oldValue)) {
                    changeCount++;
                    oldValue = {};
                    oldLength = 0;
                }
                newLength = 0;
                _.forOwn(newValue, function (newVal, key) {
                    newLength++;
                    if (oldValue.hasOwnProperty(key)) {
                        var bothNaN = _.isNaN(newVal) && _.isNaN(oldValue[key]);
                        if (!bothNaN && oldValue[key] !== newVal) {
                            changeCount++;
                            oldValue[key] = newVal;
                        }
                    } else {
                        changeCount++;
                        oldLength++;
                        oldValue[key] = newVal;
                    }
                });
                if (oldLength > newLength) {
                    changeCount++;
                    _.forOwn(oldValue, function (oldVal, key) {
                        if (!newValue.hasOwnProperty(key)) {
                            oldLength--;
                            delete oldValue[key];
                        }
                    });
                }

            }
        } else {
            if (!self.$$areEqual(newValue, oldValue, false)) {
                changeCount++;
            }

            oldValue = newValue;
        }



        return changeCount;
    };

    var internalListenerFn = function () {
        if (firstRun) {
            listenerFn(newValue, newValue, self);
            firstRun = false;
        } else {
            listenerFn(newValue, veryOldValue, self);
        }

        if (trackVaryOldValue) {
            veryOldValue = _.clone(newValue);
        }
    };

    return this.$watch(internalWatchFn, internalListenerFn);
};

// Event system

Scope.prototype.$on = function (evt, fn) {
    if(!this.$$listeners[evt]) {
        this.$$listeners[evt] = [fn];
    } else {
        this.$$listeners[evt].push(fn);
    }
};

module.exports.Scope = Scope;