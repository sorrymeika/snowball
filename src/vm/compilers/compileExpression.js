const KEYWORDS = {
    'new': true,
    'return': true,
    'undefined': true,
    'null': true,
    'if': true,
    'else': true,
    'instanceof': true,
    'typeof': true,
    'delete': true,
    'true': true,
    'false': true
};

const GLOBAL_VARS = {
    'this': true,
    'Function': true,
    '$': true,
    '$data': true,
    'Object': true,
    'Array': true,
    'String': true,
    'Number': true,
    'Symbol': true,
    'RegExp': true,
    'JSON': true,
    'Math': true,
    'Date': true,
    'parseInt': true,
    'parseFloat': true,
    'encodeURIComponent': true,
    'decodeURIComponent': true,
    'window': true,
    'document': true
};

function isKeywords(word) {
    return KEYWORDS[word];
}

let variables;
let tempVars;

export default function compileExpression(input, withBraces, retArray = false) {
    if (!input) return;
    if (withBraces == null) withBraces = true;
    if (!withBraces) input = '{' + input + '}';

    let hasExp = false;
    let cursor = 0;
    let c;
    let length = input.length;
    let code = 'try{return ';
    let str = '';
    let exps = '';
    let match;
    let connector = retArray ? ',' : '+';

    variables = [];
    tempVars = [];

    while (cursor < length) {
        c = input[cursor++];

        switch (c) {
            case '{':
                hasExp = true;
                if (str) {
                    exps += '\'' + str + '\'' + connector;
                    str = '';
                }
                exps += '(';
                match = readExp(input, cursor, '}');
                if (match.returnIndex != -1) {
                    code = match.value.substr(0, match.returnIndex) + code;
                    exps += match.value.slice(match.returnIndex + 6, -1);
                } else {
                    exps += match.value.slice(0, -1);
                }
                exps += ')' + connector;
                cursor = match.cursor;
                break;
            case '\\':
                str += '\\\\';
                break;
            case '\r':
                str += '\\r';
                break;
            case '\n':
                str += '\\n';
                break;
            default:
                str += c;
                break;
        }
    }
    if (withBraces && !hasExp) return;

    if (str) exps += '\'' + str + '\'';
    else if (exps.slice(-1) == connector)
        exps = exps.slice(0, -1);

    if (retArray) exps = '[' + exps + ']';

    if (tempVars.length) {
        code = 'var ' + tempVars.join(',') + ';' + code;
    }
    code += exps + ';}catch(e){console.error(e);return \'\';}';

    const result = {
        code,
        variables
    };
    variables = null;

    return result;
}

function validVar(c) {
    return c == '.' || c == '$' || c == '_' || (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

function charIsNum(c) {
    return c == '.' || (c >= '0' && c <= '9');
}

function isEscape(input, cursor) {
    let count = 0;
    while (input[--cursor] == '\\') {
        count++;
    }
    return count != 0 && count % 2 == 1;
}

// 是否是除法
function isDivision(input, cursor) {
    cursor -= 1;
    while (input[--cursor] == ' ') { }

    // 如果 `/` 前是数字、字符串、变量、属性或方法，说明是除法
    if (/[\w$)'"\]]/.test(input[cursor])) {
        return true;
    }
    return false;
}

function matcher(value, cursor) {
    return { value, cursor };
}

function readExp(input, cursor, endChars) {
    let c;
    let result = '';
    let match;
    let returnIndex = -1;

    while (cursor < input.length) {
        c = input[cursor++];
        if (endChars.includes(c)) {
            return {
                value: result + c,
                cursor,
                returnIndex
            };
        }

        if (c === '{') {
            // 读取object
            match = readObject(input, cursor, c);
            result += match.value;
            cursor = match.cursor;
        } else if (c == '\'' || c == '"') {
            // 读取string
            match = readString(input, cursor, c);
            result += match.value;
            cursor = match.cursor;
        } else if (charIsNum(c)) {
            // 读取number
            result += c;
            while (charIsNum(c = input[cursor])) {
                result += c;
                cursor++;
            }
        } else if (c == '/') {
            if (input[cursor] === '*') {
                // 读取comment
                match = readComment(input, ++cursor);
                result += match.value;
                cursor = match.cursor;
            } else if (!isDivision(input, cursor) && /^\/(?:(?:\\{2})+|\\\/|[^/])*\/[imguy]*(?:\.(?:test|exec)\()?/.test(input.slice(cursor - 1))) {
                // 读取RegExp
                result += RegExp.lastMatch;
                cursor += RegExp.lastMatch.length - 1;
            } else {
                result += c;
            }
        } else if (/[a-zA-Z$]/.test(c)) {
            const isProperty = input[cursor - 2] === '.';
            let varStr = c;
            while (validVar(c = input[cursor])) {
                varStr += c;
                cursor++;
            }
            if (varStr === 'var') {
                // 读取变量
                match = readVar(input, cursor);
                result += match.value;
                cursor = match.cursor;
            } else if (varStr === 'function') {
                // 读取方法
                match = readFunction(input, cursor);
                result += match.value;
                cursor = match.cursor;
            } else if (isKeywords(varStr)) {
                if (varStr == 'return') {
                    returnIndex = result.length;
                }
                // js关键字
                result += varStr;
            } else {
                while (input[cursor] == '[') {
                    match = readExp(input, cursor, ']');
                    cursor = match.cursor;

                    let tempVarName = '$temp_var' + tempVars.length;
                    varStr += '.~[' + tempVarName + ']';

                    tempVars.push(tempVarName + '=' + match.value.slice(1, -1));

                    while (validVar(c = input[cursor])) {
                        varStr += c;
                        cursor++;
                    }
                }
                if (isProperty) {
                    result += varStr;
                } else if (input[cursor] == '(') {
                    const lastPoint = varStr.lastIndexOf('.');
                    result += lastPoint != -1
                        ? parseValue(varStr.substr(0, lastPoint)) + varStr.substr(lastPoint)
                        : GLOBAL_VARS[varStr]
                            ? varStr
                            : `$data.${varStr}`;
                } else {
                    result += parseValue(varStr);
                }
            }
            // console.log(varStr);
        } else {
            result += c;
        }
    }
    throw new Error('expression has no endChars `' + endChars + '`');
}

function readString(input, cursor, quot) {
    let c;
    let result = quot;

    while (cursor < input.length) {
        c = input[cursor];
        if (c == quot && !isEscape(input, cursor)) {
            return matcher(result + quot, cursor + 1);
        } else {
            result += c;
        }
        cursor++;
    }
    throw new Error('string has no end quot!!');
}

function readComment(input, cursor) {
    let c;
    let result = '/*';

    while (cursor < input.length) {
        c = input[cursor];
        if (c == '*' && input[cursor + 1] == '/') {
            return matcher(result + '*/', cursor + 2);
        } else {
            result += c;
        }
        cursor++;
    }
    throw new Error('comment has no end!!');
}

function readObject(input, cursor) {
    let c;
    let result = '{';

    while (cursor < input.length) {
        c = input[cursor++];

        if (c == '}') {
            return matcher(result + '}', cursor);
        } else {
            // read key
            result += c;
            if (c == ':') {
                const match = readExp(input, cursor, ',}');
                result += match.value;
                cursor = match.cursor;
                if (match.value.endsWith('}')) {
                    return matcher(result, cursor);
                }
            }
        }
    }
    throw new Error('object has no end brace!!');
}

function readVar(input, cursor) {
    let c;
    let result = 'var';
    let varName = '';
    while (cursor < input.length) {
        c = input[cursor++];
        result += c;

        if (c == ',' || c == '=' || c == ';') {
            variables.push(varName);
            varName = '';

            if (c == '=') {
                const match = readExp(input, cursor, ',;');
                result += match.value;
                cursor = match.cursor;
                if (match.value.endsWith(';')) {
                    return matcher(result, cursor);
                }
            }
        } else if (c != ' ') {
            varName += c;
        }
    }
    throw new Error('var has no end `;`!!');
}

function readFunction(input, cursor) {
    let c;
    let result = 'function';
    // 保存外部作用域变量
    let outerScopes = variables;
    variables = [...outerScopes];

    while (cursor < input.length) {
        c = input[cursor++];
        result += c;

        if (c == '{') {
            const match = readExp(input, cursor, '}');
            result += match.value;
            cursor = match.cursor;
            variables = outerScopes;
            return matcher(result, cursor);
        }
    }
    throw new Error('function has no end `}`!!');
}

function parseValue(str) {
    var arr = str.split('.');
    var alias = arr[0];
    var code = '';
    var gb = '$data';

    if (!alias || GLOBAL_VARS[alias] || variables.indexOf(alias) !== -1) {
        return str;
    } else {
        switch (alias) {
            case 'delegate':
                return 'this.' + str;
            case 'srcElement':
            case 'util':
            case '$filter':
                return gb + '.' + str;
            default:
        }
    }

    arr = str.split('.');
    str = gb + '.' + str;

    var result = [];
    var i;
    for (i = 0; i < arr.length; i++) {
        result[i] = (i == 0 ? gb : result[i - 1]) + '.' + arr[i];
    }
    for (i = 0; i < result.length; i++) {
        code += (i ? '&&' : '') + result[i] + '!=null';
    }
    code = '((' + code + ')?' + str + ':"")';
    return code.replace(/\.~\[/g, '[');
}


// console.log('compileExp:', compileExpression('"asdf"as{ /*asdf.asfd*/ 3/asdf/m; /asdf/m;/asdf/m.test("asd"); some.func(); some[pa.a]; var a=1; function (){ var asdf={"obje":"ob"}; }+ \'asdf\'+1234.556+{asdf:"asdf","name": asdf}+"asdf"+true;return 2/asdf}asdf').code);

// console.log('compileExp:', compileExpression("multi {['one', 'two', 'three', 'gt_three'][products.length-1] || 'gt_three'}").code);

// console.log('compileExp:', compileExpression("距离{rounds[roundIndex].status[name].name[name][name] ? '结束' : '开始'}还有").code);

// console.log(compileExpression(`{
//     prd.healthGoldDeductibleAmount == 0
//         ? (prd.price + '元')
//         : prd.healthGoldDeductibleAmount == prd.price
//             ? (prd.healthGoldDeductibleAmount + '金')
//             : (prd.healthGoldDeductibleAmount + '金' + '+' + (+Math.abs(prd.price - prd.healthGoldDeductibleAmount).toFixed(2)) + '元')
// }`).code);

if (process.env.NODE_ENV === 'development') {
    console.assert(compileExpression("距离{rounds[roundIndex].status[name].name[name][name] ? '结束' : '开始'}还有").code == `var $temp_var0=(($data.roundIndex!=null)?$data.roundIndex:""),$temp_var1=(($data.name!=null)?$data.name:""),$temp_var2=(($data.name!=null)?$data.name:""),$temp_var3=(($data.name!=null)?$data.name:"");try{return '距离'+((($data.rounds!=null&&$data.rounds[$temp_var0]!=null&&$data.rounds[$temp_var0].status!=null&&$data.rounds[$temp_var0].status[$temp_var1]!=null&&$data.rounds[$temp_var0].status[$temp_var1].name!=null&&$data.rounds[$temp_var0].status[$temp_var1].name[$temp_var2]!=null&&$data.rounds[$temp_var0].status[$temp_var1].name[$temp_var2][$temp_var3]!=null)?$data.rounds[$temp_var0].status[$temp_var1].name[$temp_var2][$temp_var3]:"") ? '结束' : '开始')+'还有';}catch(e){console.error(e);return '';}`, 'compileExpression error');
}