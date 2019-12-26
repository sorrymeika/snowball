import { Observer } from "./Observer";
import { enqueueUpdate, defer } from "./methods/enqueueUpdate";


export default class State extends Observer {
    /**
     * 异步设置数据
     * 无论设置数据和老数据是否相同，都会触发数据变更事件
     * @param {any} data 数据
     */
    set(data) {
        if (this.state.next) {
            return this.state.next = this.state.next.then(() => this.set(data));
        }

        Observer.prototype.set.call(this, data);

        const newData = this.state.data;
        enqueueUpdate(this);

        return this.state.next = defer(() => newData);
    }
}