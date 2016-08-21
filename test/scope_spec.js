/* jshint globalstrict: true */
/* global describe: false */
/* global it: false */
/* global expect: false */
/* global require: false */
/* global beforeEach: false */
/* global jasmine: false */
"use strict"; 

var Scope = require('../src/scope').Scope;

describe("Scope", function () {

    it("Can be constructed and used as an object", function () {
        var scope = new Scope();
        scope.aProperty = 1;
        
        expect(scope.aProperty).toBe(1);
    });

    describe("digest", function () {
        var scope;

        beforeEach(function () {
            scope = new Scope();
        });

        it("calls the listener function of a watch on first $digest", function () {
            var watchFn = function () { return 'wat'; };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });
    });
});