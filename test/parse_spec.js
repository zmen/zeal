var _ = require('lodash');
var parse = require('../src/parse').parse;

describe("parse", function () {

    it("can parse an integer", function () {
        var fn = parse('42');
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    });

    it("can parse a float number", function () {
        var fn = parse('4.2');
        expect(fn()).toBe(4.2);
    });

    it("can parse a float number started with dot", function () {
        var fn = parse('.42');
        expect(fn()).toBe(0.42);
    });
});
