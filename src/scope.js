/* jshint globalstrict: true */
/* global module: false */
"use strict";
function Scope() {
    this.watchers = [];
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
    this.watchers.forEach(function (v) {
        newValue = v.watcherFn(self);
        oldValue = v.last;
        if (newValue !== oldValue) {
            v.last = newValue;
            v.listenerFn(newValue, 
                        oldValue === initWatchVal? newValue: oldValue, 
                        self);
            dirty = true;
        }
    });
    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty;
    var ttl = 10;
    do {
        dirty = this.$$digestOnce();
        if (dirty && !(ttl--)) {
            throw "10 digest iterations reached";
        }
    } while (dirty) ;
};

module.exports.Scope = Scope;