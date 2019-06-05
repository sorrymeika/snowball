import { Observer } from "./Observer";
import { enqueueUpdate, nextTick } from "./methods/enqueueUpdate";

const resolvedPromise = Promise.resolve();

export default class State extends Observer {
    static isState = (state) => {
        return state instanceof State;
    }

    /**
     * 异步设置数据
     * 无论设置数据和老数据是否相同，都会触发数据变更事件
     * @param {any} data 数据
     */
    set(data) {
        return new Promise((done) => {
            this.state.next = (this.state.next || resolvedPromise).then(() => {
                return new Promise((resolve) => {
                    nextTick(() => {
                        super.set.call(this, data);
                        const newData = this.state.data;
                        enqueueUpdate(this);
                        resolve();
                        nextTick(() => done(newData));
                    });
                });
            });
        });
    }
}