import { Observer } from "./Observer";
import { updateRefs } from "./methods/updateRefs";
import { emitUpdate } from "./methods/enqueueUpdate";

/**
 * 立即触发型Observer
 */
export default class Emitter extends Observer {
    static isEmitter = (emitter) => {
        return emitter instanceof Emitter;
    }

    set(data) {
        if (this.state.changed = (this.state.data !== data)) {
            this.state.data = data;
            updateRefs(this);
        }
        if (this.state.initialized) {
            emitUpdate(this);
        }
        return this;
    }
}