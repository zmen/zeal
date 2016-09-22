/* jshint globalstrict: true */
/* global require: false */
/* global module: false */

"use strict";

var _ = require("lodash");
require("../src/angular");

function parse (expr) {
    var lexer = new Lexer();
    var parser = new Parser(lexer);
    return parser.parse(expr);
}

function Lexer () {

}

Lexer.prototype.lex = function (text) {

};

function AST (lexer) {
    this.lexer = lexer;
}

function ASTCompiler (astBuilder) {
    this.astBuilder = astBuilder;
}

ASTCompiler.prototype.compile = function (text) {
    var ast = this.astBuilder.ast(text);
};

function Parser (lexer) {
    this.lexer = lexer;
    this.ast = new AST(this.lexer);

    this.ASTCompiler = new ASTCompiler(this.ast);
}

Parser.prototype.parse = function (text) {
    return this.astCompiler.compile(text);
};

module.exports.parse = parse;