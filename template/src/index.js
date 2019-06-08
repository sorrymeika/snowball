import { createApplication } from "snowball/app";
import "./sass/style.scss";
import "./app/home/controllers/HomeController";

const projects = {
};

const routes = {
    '/test': import("./Test")
};

createApplication({
    projects,
    routes,
    autoStart: true
}, document.getElementById('root'), () => {
    console.log('application start!');
});
