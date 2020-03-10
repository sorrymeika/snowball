
import './sass/style.dev.scss';
import 'snowball';
import { createApplication } from "snowball/app";
import router from "./app/router";

const app = createApplication({
    routes: router,
    autoStart: true,
    extend() {
        return {
        };
    }
}, document.getElementById('root'), () => {
    console.log('application start!');
});

window.SNOWBALL_MAIN_APP = app;
