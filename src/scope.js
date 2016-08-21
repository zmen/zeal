/* jshint globalstrict: true */
/* global module: false */
"use strict";
function Scope() {
    this.watchers = [];
}

Scope.prototype.$watch = function (watcherFn, listenerFn) {
    this.watchers.push({
        watcherFn: watcherFn,
        listenerFn: listenerFn
    });
};

Scope.prototype.$digest = function () {
    this.watchers.forEach(function (v) {
        v.listenerFn();
    });
}

module.exports.Scope = Scope;