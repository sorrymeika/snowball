import { readExpression } from "./compile";

export type IVNode = {
    type: string,
    tagName: string,
    props: [],
    attributes: [],
    parent: IVNode,
    children: IVNode[] | string
}

// 匹配repeat:
// 1. item, i in collection|filter:i==1&&contains(item, { name: 1 })|orderBy:date desc, name asc
// 2. item in collection|filter:this.filter(item, i)|orderBy:this.sort()
// 3. item in collection|orderBy:{column} asc, name {ascOrDesc}
const RE_REPEAT = /([\w$]+)(?:\s*,\s*([\w$]+)){0,1}\s+in\s+([\w$]+(?:\.[\w$(,)]+|\[\d+\]){0,})(?:\s*\|\s*filter\s*:\s*(.+?)){0,1}(?:\s*\|\s*orderBy:(.+)){0,1}(\s|$)/;

export function createVNode({ tagName, events, props, attributes }) {
    const vnode = {
        tagName,
        events
    };

    if (tagName.slice(0, 3) === 'sn-' || /^[A-Z]/.test(tagName[0])) {
        vnode.type = 'component';
    } else {
        vnode.type = 'node';
    }

    const vnodeProps = [];
    const vnodeAttrs = [];

    if (props) {
        for (let i = 0; i < props.length; i += 2) {
            let key = props[i],
                val = props[i + 1];

            if (key === 'sn-if' || key === 'sn-else-if' || key === 'sn-else') {
                vnode.visibleProps = {
                    type: key.slice(3),
                    fid: val
                };
            } else if (key === 'ref') {
                vnode.refProps = {
                    type: 'func',
                    fid: val
                };
            } else {
                vnodeProps.push(key, val);
            }
        }
    }

    if (attributes) {
        for (let i = 0; i < attributes.length; i += 2) {
            const key = attributes[i],
                val = attributes[i + 1];

            if (key === 'sn-repeat') {
                const match = val.match(RE_REPEAT);
                const alias = match[1];
                const indexAlias = match[2];
                const dataSourcePath = match[3].split('.');
                const filter = match[4];
                const orderBy = match[5];

                vnode.repeatProps = {
                    value: val,
                    dataSourcePath,
                    alias,
                    indexAlias,
                    filter: compileFilter(filter),
                    ...compileOrderBy(orderBy)
                };
            } else if (key === 'ref') {
                vnode.refProps = {
                    type: 'string',
                    name: val
                };
            } else {
                vnodeAttrs.push(key, val);
            }
        }
    }

    vnode.props = vnodeProps;
    vnode.attributes = vnodeAttrs;

    return vnode;
}

function compileFilter(filter) {
    if (filter) {
        const match = readExpression(filter + '}', 0);
        if (match) {
            return match.value;
        }
    }
}

function compileOrderBy(orderByCode) {
    if (!orderByCode) return;

    let orderByType,
        orderBy;

    if (/^([\w$]+)\.([\w$]+(\.[\w$]+)*)$/.test(orderByCode)) {
        orderByType = 'property';
        switch (RegExp.$1) {
            case 'this':
                orderBy = RegExp.$2;
                break;
            case 'delegate':
                orderBy = orderByCode;
                break;
            default:
                orderBy = 'state.data.' + orderByCode;
        }
    } else {
        orderByType = 'exp';
        orderBy = [];

        orderByCode.split(/\s*,\s*/).forEach((sort) => {
            const [sortKeyStr, sortTypeStr] = sort.split(' ');
            let sortKey,
                sortType;

            if (sortKeyStr.charAt(0) == '{' && sortKeyStr.slice(-1) == '}') {
                sortKey = readExpression(sortKeyStr, 1).value;
            }
            sortType = (sortTypeStr && sortTypeStr.charAt(0) == '{' && sortTypeStr.slice(-1) == '}')
                ? readExpression(sortTypeStr, 1).value
                : sortTypeStr !== 'desc';

            orderBy.push(sortKey, sortType);
        });
    }

    return {
        orderByType,
        orderBy
    };
}