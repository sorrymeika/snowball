import every from './every';

export default function once(observers) {
    const observer = every(observers)
        .observe(() => {
            observer.destroy();
        });
    return observer;
}
