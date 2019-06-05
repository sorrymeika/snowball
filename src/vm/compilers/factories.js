import CompilerManager from './CompilerManager';
import NodeHandler from './NodeHandler';
import AttributeHandler from './AttributeHandler';

import { EventCompiler, EventAttributeCompiler } from './events';
import { RepeatNodeCompiler } from './repeat';
import { ComponentCompiler } from './component';
import { IfCompiler } from './IfCompiler';
import { RefAttributeCompiler } from './ref';

export function createCompilerManager(template) {
    return new CompilerManager([new EventCompiler(template)]);
}

export function createNodeHandler(template) {
    return new NodeHandler(
        template,
        [ComponentCompiler, RepeatNodeCompiler, IfCompiler].map((Compiler) => new Compiler(template))
    );
}

export function createAttributeHandler(template) {
    return new AttributeHandler(
        template,
        [EventAttributeCompiler, RefAttributeCompiler].map((Compiler) => new Compiler(template))
    );
}