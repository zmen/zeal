/* jshint globalstrict: true */
/* global module: false */
/* global require: false */
"use strict";

var _ = require("lodash");

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$phase = null;
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
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
    this.$$lastDirtyWatch = null;

    return function () {
        var index = self.$$watchers.indexOf(watch);
        if (index > -1) {
            self.$$watchers.splice(index, 1);
            self.$$lastDirtyWatch = null;
        }
    };
};

Scope.prototype.$$digestOnce = function () {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEachRight(this.$$watchers, function (watcher) {
        try {
            if (watcher) {
                newValue = watcher.watcherFn(self);
                oldValue = watcher.last;
                if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                    self.$$lastDirtyWatch = watcher;
                    watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
                    watcher.listenerFn(newValue,
                        (oldValue === initWatchVal ? newValue : oldValue),
                        self
                    );
                    dirty = true;
                } else if (self.$$lastDirtyWatch == watcher) {
                    return false;
                }
            }
        } catch (e) {
            console.log(e);
        }
    });

    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty;
    var ttl = 10;
    this.$$lastDirtyWatch = null;
    this.$beginPhase("$digest");

    if (this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
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
        this.$digest();
    }
};

Scope.prototype.$evalAsync = function (expr) {
    var self = this;
    if (!self.$$phase && !self.$$asyncQueue.length) {
        setTimeout(function () {
            if (self.$$asyncQueue.length) {
                self.$digest();
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
    if (self.$$applyAsyncId === null) {
        self.$$applyAsyncId = setTimeout(function () {
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
    this.$$applyAsyncId = null;
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

    function watchGroupListener () {
        if (firstRun) {
            firstRun = false;
            listenerFn(newValues, newValues, self);
        } else {
            listenerFn (newValues, oldValues, self);
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

    return function  () {
        _.forEach(destroyFunctions, function  (destroyFunction) {
            destroyFunction();
        });
    };
}

module.exports.Scope = Scope;