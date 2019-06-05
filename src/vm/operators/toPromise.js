export default function toPromise(observer) {
    return new Promise((resolve) => {
        if (observer.state.updated) {
            resolve(observer.get());
        } else {
            const once = (val) => {
                observer.unobserve(once);
                resolve(val);
            };
            observer.observe(once);
        }
    });
}