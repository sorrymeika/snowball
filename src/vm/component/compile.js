import { createVNode, IVNode } from './createVNode';

type IMatch = {
    cursor: number
}

const KEYWORDS = {
    'switch': true,
    'case': true,
    'default': true,
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
    '$setter': true,
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


let vnodes;
let tempVars;
let variables;
let functions;
let functionId;

export function compile(htmlString) {
    functionId = 0;
    functions = '';
    vnodes = [];

    const root = {
        type: 'root',
        children: []
    };
    vnodes.push(root);

    readHtmlString(htmlString);

    let fns;
    if (functions) {
        fns = new Function('return [' + functions.slice(0, -1) + ']')();
    } else {
        fns = [];
    }
    root.fns = fns;

    functionId = 0;
    functions = null;
    vnodes = null;

    return root;
}

export function readExpression(input, cursor) {
    if (functions == null) {
        throw new Error('必须在compile中调用readExpression!');
    }

    variables = [];
    tempVars = [];

    let code = 'try{';
    let match = readBlock(input, cursor, '}');
    if (!match.hasReturn) {
        code += 'return ';
    }
    if (tempVars.length) {
        code = 'var ' + tempVars.join(',') + ';' + code;
    }
    code += match.value + ';}catch(e){';

    if (process.env.NODE_ENV === 'development') {
        code += 'console.error(e);';
    }

    code += 'return \'\';}';

    functions += 'function($data,$setter){' + code + '},';

    const vars = variables;
    variables = null;

    return {
        isExpression: true,
        cursor: match.cursor,
        value: functionId++,
        vars
    };
}

function isKeywords(word) {
    return KEYWORDS[word];
}

function validTagName(c) {
    return c == '-' || c == '_' || (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
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

function readHtmlString(input) {
    if (!input) return;

    let length = input.length;
    let cursor = 0;
    let c = 0;
    let text = '';
    let match: IMatch;
    let parentVNode;

    while (cursor < length) {
        c = input[cursor++];

        switch (c) {
            case '<':
                if (input[cursor] == '/') {
                    match = readEndTag(input, cursor);
                    if (match) {
                        cursor = match.cursor;
                    }
                } else {
                    match = readElement(input, cursor);
                    if (match) {
                        parentVNode = vnodes[vnodes.length - 1];

                        if (text && (text = text.trim())) {
                            appendChild(parentVNode, {
                                type: 'textNode',
                                nodeValue: text
                            });
                            text = '';
                        }

                        appendChild(parentVNode, match.vnode);
                        cursor = match.cursor;
                    } else {
                        text += c;
                    }
                }
                break;
            case '{':
                match = readExpression(input, cursor);
                if (match) {
                    parentVNode = vnodes[vnodes.length - 1];
                    appendChild(parentVNode, {
                        type: 'textNode',
                        props: ['nodeValue', match.value]
                    });
                    cursor = match.cursor;
                }
                break;
            default:
                text += c;
                break;
        }
    }

    if (text && (text = text.trim())) {
        appendChild(vnodes[vnodes.length - 1], {
            type: 'textNode',
            nodeValue: text
        });
    }
}

function readElement(input, cursor, parent: IVNode) {
    const tag = readStartTag(input, cursor);

    if (!tag) {
        return null;
    }

    const vnode = createVNode(tag);

    if (!tag.selfClose) {
        vnodes.push(vnode);
    }

    return {
        cursor: tag.cursor,
        vnode: vnode
    };
}

function readStartTag(input, cursor) {
    let tagName = '';
    let c;
    let prevChar = '';
    let match;
    let attributes;
    let props;

    while (cursor < input.length) {
        c = input[cursor++];

        switch (c) {
            case ' ':
                match = readAttributes(input, cursor);
                if (match) {
                    attributes = match.attributes;
                    props = match.props;
                    cursor = match.cursor;
                }
                break;
            case '>':
                return {
                    tagName,
                    selfClose: prevChar === '/',
                    props,
                    attributes,
                    cursor
                };
            case '<':
                return null;
            default:
                prevChar = c;
                if (validTagName(c)) {
                    tagName += c;
                } else if (c !== '/') {
                    return null;
                }
                break;
        }
    }
}

function readEndTag(input, cursor) {
    let c;
    let tagName = '';

    while (cursor < input.length) {
        c = input[cursor++];

        switch (c) {
            case '>':
                vnodes.pop();
                return {
                    tagName,
                    cursor
                };
            default:
                if (!validTagName(c)) {
                    return null;
                }
                tagName += c;
                break;
        }
    }
}

function readAttributes(input, cursor) {
    let c;
    let match;
    let name = '';
    let attributes = [];
    let props = [];
    let events = [];

    while (cursor < input.length) {
        c = input[cursor++];

        switch (c) {
            case ' ':
                if (name) {
                    attributes.push(name, true);
                    name = '';
                }
                break;
            case '{':
                if (input[cursor] == '.' && input[cursor + 1] == '.' && input[cursor + 2] == '.') {
                    cursor += 3;
                }
                match = readExpression(input, cursor);
                props.push('...', match.value);
                cursor = match.cursor;
                break;
            case '@':
                name = '';

                do {
                    c = input[cursor++];
                    if (!c || c == '<' || c == '>') {
                        return;
                    }
                    name += c;
                } while (c != '=');

                match = readEvent(input, cursor);
                events.push(name, match.value);
                cursor = match.cursor;
                name = '';
                break;
            case '=':
                match = readAttributeValue(input, cursor);
                if (match) {
                    if (match.isExpression) {
                        attributes.push(name, match.value);
                    } else {
                        props.push(name, match.value);
                    }
                    name = '';
                    cursor = match.cursor;
                }
                break;
            case '/':
            case '>':
                return {
                    events,
                    props,
                    attributes,
                    cursor: cursor - 1
                };
            default:
                name += c;
                break;
        }
    }
}

function readEvent(input, cursor) {
    if (input[cursor++] != '{') {
        return;
    }
    return readExpression(input, cursor);
}

function readAttributeValue(input, cursor) {
    let c;
    let value = '';

    while (cursor < input.length) {
        c = input[cursor++];

        switch (c) {
            case '{':
                return readExpression(input, cursor);
            case ' ':
                return {
                    cursor,
                    value
                };
            case '/':
            case '>':
                return {
                    cursor: cursor - 1,
                    value
                };
            case '\'':
            case '"':
                // 读取string
                return readString(input, cursor, c);
            default:
                value += c;
                break;
        }
    }
}

function readBlock(input, cursor, endChars) {
    let c;
    let result = '';
    let match;

    while (cursor < input.length) {
        c = input[cursor++];
        if (endChars.includes(c)) {
            return {
                value: result + c,
                cursor
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
                    match.hasReturn = true;
                }
                // js关键字
                result += varStr;
            } else {
                while (input[cursor] == '[') {
                    match = readBlock(input, cursor, ']');
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
                    // is function
                    const lastPoint = varStr.lastIndexOf('.');
                    result += lastPoint != -1
                        ? parseValue(varStr.substr(0, lastPoint)) + varStr.substr(lastPoint)
                        : GLOBAL_VARS[varStr]
                            ? varStr
                            : `$data.${varStr}`;
                } else if (isSetter(input, cursor)) {
                    // 设置表达式: property.name = 'xxx'
                    result += '$setter("' + varStr + '",$data).value';
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

function isSetter(input, cursor) {
    let c;

    while (cursor < input.length) {
        c = input[cursor++];
        if (c !== ' ') {
            return (c === '=' && input[cursor] !== '=');
        }
    }
    return false;
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
                const match = readBlock(input, cursor, ',}');
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
                const match = readBlock(input, cursor, ',;');
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
            const match = readBlock(input, cursor, '}');
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

function appendChild(vnode, childVNode) {
    (vnode.children || (vnode.children = [])).push(childVNode);
}