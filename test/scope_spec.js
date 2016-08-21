/* jshint globalstrict: true */
/* global describe: false */
/* global it: false */
/* global expect: false */
/* global require: false */
"use strict"; 

var Scope = require('../src/scope').Scope;

describe("Scope", function () {

    it("Can be constructed and used as an object", function () {
        var scope = new Scope();
        scope.aProperty = 1;
        
        expect(scope.aProperty).toBe(1);
    });
});