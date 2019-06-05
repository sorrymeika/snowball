
export class RefAttributeCompiler {
    beforeUpdate(nodeData, attrName, val) {
        if (attrName === 'ref') {
            if (typeof val === 'function') {
                val(nodeData.ref);
            } else {
                var refs = nodeData.template.viewModel.refs;
                refs[val] = nodeData.ref.snIsRepeat
                    ? (refs[val] || []).concat([nodeData.ref])
                    : nodeData.ref;
            }
            return false;
        }
    }
}