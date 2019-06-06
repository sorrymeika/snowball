
export default class AttributeHandler {
    constructor(template, compilers) {
        this.template = template;
        this.compilers = compilers.filter((compiler) => compiler.compile);
        this.updaters = compilers.filter((compiler) => compiler.update);
        this.beforeUpdaters = compilers.filter((compiler) => compiler.beforeUpdate);
    }

    reduce(el, attr, val, root) {
        var compilers = this.compilers;
        for (var i = 0; i < compilers.length; i++) {
            if (compilers[i].compile(el, attr, val, root) === false) {
                return;
            }
        }
        this.compile(el, attr, val);
    }

    beforeUpdate(nodeData, attr, val) {
        var updaters = this.beforeUpdaters;
        for (var i = 0; i < updaters.length; i++) {
            if (updaters[i].beforeUpdate(nodeData, attr, val) === false) {
                return false;
            }
        }
    }

    update(el, attr, val) {
        var updaters = this.updaters;
        for (var i = 0; i < updaters.length; i++) {
            if (updaters[i].update(el, attr, val)) {
                return;
            }
        }
    }

    compile(el, attr, val, withBraces) {
        var fid = this.template.compileToFunction(val, withBraces);
        if (fid) {
            (el.snAttributes || (el.snAttributes = [])).push(attr, fid);
            el.removeAttribute(attr);
        }
    }
}