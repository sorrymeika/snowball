
require('./sass/style.dev.scss');
require('snowball');
require('nuclear');

const { createApplication } = require("snowball/app");
const router = require("./app/router");

createApplication({
    routes: router.default,
    autoStart: true,
    extend() {
        return {
        };
    }
}, document.getElementById('root'), () => {
    console.log('application start!');
});
