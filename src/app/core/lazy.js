export default function lazy(fn) {
    let promise;

    return {
        $$typeof: 'snowball/app#lazy',
        then(cb) {
            return (promise || (promise = fn()))
                .then(cb);
        }
    };
}