import { createApplication } from "snowball/app";
import Home from "./Home";
import Test from "./Test";
import "./sass/style.scss";

const projects = {
};

const routes = {
    '/': Home,
    '/test': Test
};

createApplication({
    projects,
    routes,
    autoStart: true
}, document.getElementById('root'), () => {
    console.log('application start!');
});
