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

Scope.prototype.$watch = function (watcherFn, listenerFn) {
    this.watchers.push({
        watcherFn: watcherFn,
        listenerFn: listenerFn || noop,
        last: initWatchVal
    });
};

Scope.prototype.$$digestOnce = function () {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEach(this.watchers, function (watcher) {
        newValue = watcher.watcherFn(self);
        oldValue = watcher.last;
        if (newValue !== oldValue) {
            self.$$lastDirtyWatch = watcher;
            watcher.last = newValue;
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

module.exports.Scope = Scope;