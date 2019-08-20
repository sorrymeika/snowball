if (process.env.NODE_ENV === 'production') {
    require('./index.prod');
} else {
    window.SNOWBALL_MAIN_APP
        ? require('./index.prod')
        : require('./index.dev');
}