export default function next(observer) {
    return new Promise((resolve) => {
        const once = (val) => {
            observer.unobserve(once);
            resolve(val);
        };
        observer.observe(once);
    });
}