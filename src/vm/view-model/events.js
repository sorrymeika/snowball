import { $, TRANSITION_END } from '../../utils/dom';
import { RE_STRING, codeRegExp } from '../../utils/regex';
import getFunctionArg from './getFunctionArg';

const EVENTS = {
    tap: 'tap',
    longtap: 'longTap',
    'long-tap': 'longTap',
    transitionend: TRANSITION_END,
    'transition-end': TRANSITION_END,
    touchstart: 'touchstart',
    touchend: 'touchend',
    touchmove: 'touchmove',
    click: 'click',
    load: 'load',
    error: 'error',
    change: 'change',
    input: 'input',
    focus: 'focus',
    blur: 'blur',
    submit: 'submit',
    scroll: 'scroll',
    scrollstop: 'scrollStop'
};

const EVENT_DELEGATES = ((_delegates) => Object.values(EVENTS).filter((type) => {
    if (!_delegates[type] && useDelegate(type)) {
        _delegates[type] = true;
        return true;
    }
    return false;
}))({});

const RE_GLOBAL_METHOD = /^((Math|JSON|Object|Array|Number|Function|String|Symbol|RegExp|document|window|Date|util|\$)(\.|$)|(encodeURIComponent|decodeURIComponent|parseInt|parseFloat)$)/;
const RE_METHOD = codeRegExp("\\b((?:this\\.){0,1}[\\.\\w$]+)((...))", 'g', 4);
const RE_SET = codeRegExp("([\\w$]+(?:\\.[\\w$]+)*)\\s*=\\s*((?:(...)|" + RE_STRING + "|[\\w$][!=]==?|[^;=])+?)(?=;|,|\\)|$)", 'g', 4);
const events = {};

function useDelegate(eventName) {
    switch (eventName) {
        case 'scroll':
        case 'scrollStop':
            return false;
        default:
            return true;
    }
}

function getDOMEventId(viewModel, eventType) {
    return 'sn' + viewModel.state.id + eventType;
}

function getEventSelector(viewModel, eventType) {
    return '[' + getDOMEventId(viewModel, eventType) + ']';
}

function getEventDelegates(node) {
    return node.snEventDelegates;
}

function putEventDelegates(node, type) {
    const eventDelegates = node.snEventDelegates || (node.snEventDelegates = {});
    eventDelegates[type] = true;
}

function getEventProxy(viewModel) {
    return events[viewModel.eventId] || (events[viewModel.eventId] = (e) => {
        if (e.type == TRANSITION_END && e.target != e.currentTarget) {
            return;
        }
        var target = e.currentTarget;
        var eventCode = target.getAttribute(getDOMEventId(viewModel, e.type));

        if (eventCode == 'false') {
            return false;
        } else if (+eventCode) {
            var proto = target.snData || viewModel.scope || null;
            var args = getFunctionArg(target, Object.create(proto));
            args.e = e;

            return viewModel.compiler.executeFunction(eventCode, args);
        }
    });
}

export function bindEvents($element, viewModel) {
    respondInput($element, viewModel);

    var eventDelegateFn = getEventProxy(viewModel);
    for (var i = 0; i < EVENT_DELEGATES.length; i++) {
        var eventType = EVENT_DELEGATES[i];
        var selector = getEventSelector(viewModel, eventType);

        $element
            .on(eventType, selector, eventDelegateFn)
            .filter(selector)
            .on(eventType, eventDelegateFn);
    }
}

export function unbindEvents($element, viewModel) {
    $element.off('input change blur', '[' + viewModel.eventId + ']');

    var eventDelegateFn = getEventProxy(viewModel);
    for (var i = 0; i < EVENT_DELEGATES.length; i++) {
        var eventType = EVENT_DELEGATES[i];
        var selector = getEventSelector(viewModel, eventType);

        $element
            .off(eventType, selector, eventDelegateFn)
            .filter(selector)
            .off(eventType, eventDelegateFn);
    }
}

function respondInput($root, viewModel) {
    $root.on('input change blur', '[' + viewModel.eventId + ']', function (e) {
        var target = e.currentTarget;

        switch (e.type) {
            case 'change':
            case 'blur':
                switch (target.nodeName) {
                    case 'TEXTAREA':
                        return;
                    case 'INPUT':
                        switch (target.type) {
                            case 'hidden':
                            case 'radio':
                            case 'checkbox':
                            case 'file':
                                break;
                            default:
                                return;
                        }
                        break;
                    default:
                }
                break;
            default:
        }

        viewModel.elementData(target, target.getAttribute(viewModel.eventId), target.value);
    });
}

export class EventCompiler {
    constructor(template) {
        const viewModel = this.viewModel = template.viewModel;

        viewModel.on("destroy", () => {
            delete events[viewModel.eventId];
            if (viewModel.$el) {
                viewModel.$el.each((i, el) => {
                    $(el.snIfSource || el).off('input change blur', '[' + viewModel.eventId + ']');
                });
            }
        });
    }

    compile($elements) {
        const viewModel = this.viewModel;

        $elements.each((i, el) => {
            const $el = $(el);
            const eventDelegates = getEventDelegates(el);

            if (el.snRespondInput) {
                respondInput($el, viewModel);
            }

            if (eventDelegates) {
                var eventDelegateFn = getEventProxy(viewModel);
                Object.keys(eventDelegates)
                    .forEach((type) => {
                        const selector = getEventSelector(viewModel, type);

                        $el.on(type, selector, eventDelegateFn)
                            .filter(selector)
                            .on(type, eventDelegateFn);

                        viewModel.on("destroy", () => {
                            $el.off(type, selector, eventDelegateFn)
                                .filter(selector)
                                .off(type, eventDelegateFn);
                        });
                    });
            }
        });
    }
}

export class EventAttributeCompiler {
    constructor(template) {
        this.template = template;
    }

    compile(el, attr, val, root) {
        if (attr == 'sn-model') {
            el.removeAttribute(attr);
            el.setAttribute(this.template.viewModel.eventId, val);
            root.snRespondInput = true;
            return false;
        }

        var eventType = EVENTS[attr.slice(3)];
        if (eventType) {
            el.removeAttribute(attr);

            var template = this.template;
            var viewModel = template.viewModel;
            var eventId = getDOMEventId(viewModel, eventType);
            var fid = this.compileEvent(val);

            if (fid) {
                el.setAttribute(eventId, fid);
            }

            if (useDelegate(eventType)) {
                putEventDelegates(root, eventType);
            } else {
                (el.snEvents || (el.snEvents = [])).push(eventType);
                $(el).on(eventType, getEventProxy(viewModel));
            }

            return false;
        }
    }

    compileEvent(val) {
        if (val == 'false') return val;

        var content = val
            .replace(RE_METHOD, function (match, $1, $2) {
                return RE_GLOBAL_METHOD.test($1)
                    ? match
                    : ($1 + $2.slice(0, -1) + ($2.length == 2 ? '' : ',') + 'e)');
            })
            .replace(RE_SET, 'this.elementData(e.currentTarget,\'$1\',$2)');

        return this.template.compileToFunction(content, false);
    }

    update(el, attr, val) {
        if (attr == 'sn-src' && val) {
            var viewModel = this.template.viewModel;
            if (el.getAttribute(getDOMEventId(viewModel, 'load')) || el.getAttribute(getDOMEventId(viewModel, 'error'))) {
                $(el).one('load error', getEventProxy(viewModel));
            }
        }
    }
}

export function cloneEvents(viewModel, node, nodeClone) {
    const types = node.snEvents;
    if (types) {
        for (var i = 0; i < types.length; i++) {
            $(nodeClone).on(types[i], getEventProxy(viewModel));
        }
    }
}
