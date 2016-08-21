/* jshint globalstrict: true */
/* global module: false */
"use strict";
function Scope() {
    this.watchers = [];
}
function initWatchVal() {}

Scope.prototype.$watch = function (watcherFn, listenerFn) {
    this.watchers.push({
        watcherFn: watcherFn,
        listenerFn: listenerFn,
        last: initWatchVal
    });
};

Scope.prototype.$digest = function () {
    var self = this;
    this.watchers.forEach(function (v) {
        var newValue = v.watcherFn(self);
        var oldValue = v.last;
        if (newValue !== oldValue) {
            v.last = newValue;
            v.listenerFn(newValue, oldValue, self);
        }
    });
}

module.exports.Scope = Scope;