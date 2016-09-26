function lexer (expr) {
    var tokens = [];
    var numbers = "";
    for (var i = 0; i < expr.length; i++) {
        if (isNumber(expr[i])) {
            numbers += expr[i];
        } else {
            throw 'Unexpected next character ' + expr[i];
        }
    }
    tokens.push({
        text: numbers,
        value: Number(numbers)
    });
    return tokens;
}

function astBuilder (tokens) {

    return {
        type: "Program",
        body: {
            type: "Literal",
            value: tokens[0].value
        }
    };
}

function astCompiler (ast) {
    switch (ast.type) {
        case 'Program':
        case 'Literal':
            return ast.body.value;
    }

}

function parse (expr) {
    return  function () {
        return astCompiler(astBuilder(lexer(expr)));
    }
}

function isNumber (ch) {
    return '0' <= ch && ch <= '9';
}

module.exports.parse = parse;
