let preloader;

if (process.env.NODE_ENV === 'test') {
    preloader = {
        env: {},
        getManifest: () => null
    };
    window.requestAnimationFrame = setTimeout;
} else {
    preloader = window.preloader;
}

export default preloader;