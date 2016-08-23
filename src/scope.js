/* jshint globalstrict: true */
/* global module: false */
"use strict";

var _ = require("lodash");

function Scope() {
    this.watchers = [];
    this.$$lastDirtyWatch = null;
}

function initWatchVal() {}

function noop() {}

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
    this.watchers.push({
        watcherFn: watcherFn,
        listenerFn: listenerFn || noop,
        valueEq: !!valueEq,
        last: initWatchVal
    });
    this.$$lastDirtyWatch = null;
};

Scope.prototype.$$digestOnce = function () {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEach(this.watchers, function (watcher) {
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
    });

    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty;
    var ttl = 10;
    this.$$lastDirtyWatch = null;
    do {
        dirty = this.$$digestOnce();
        if (dirty && !(ttl--)) {
            throw "10 digest iterations reached";
        }
    } while (dirty) ;
};

Scope.prototype.$eval = function (exp, arg) {
    return exp(this, arg);
};

module.exports.Scope = Scope;