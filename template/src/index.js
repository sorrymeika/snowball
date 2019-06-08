import { createApplication } from "snowball/app";
import Home from "./Home";

const projects = {
};

const routes = {
    '/': Home
};

createApplication({
    projects,
    routes,
    autoStart: true
}, document.getElementById('root'), () => {
    console.log('application start!');
});
