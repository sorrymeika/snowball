import { Observer } from "./Observer";
import { enqueueUpdate, nextTick } from "./methods/enqueueUpdate";
import { TYPEOF } from "./predicates";

const resolvedPromise = Promise.resolve();

export default class Frame extends Observer {
    /**
     * 异步设置数据，本桢渲染完成才会触发下一次
     * 无论设置数据和老数据是否相同，都会触发数据变更事件
     * @param {any} data 数据
     */
    set(data) {
        return new Promise((done) => {
            this.state.next = (this.state.next || resolvedPromise).then(() => {
                return new Promise((resolve) => {
                    nextTick(() => {
                        Observer.prototype.set.call(this, data);
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

Frame.prototype[TYPEOF] = 'Frame';
