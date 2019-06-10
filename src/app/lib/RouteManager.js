import { IRouteManager } from "../types";
import { qs } from "../../utils";
import { loadProject } from "./resource";
import loader from "../../widget/loader";

class Route {
    constructor(name, viewFactory) {
        this.name = name;
        this.viewFactory = viewFactory;

        const paths = name.split('/').map((item) => {
            return !item
                ? ''
                : item.replace(/^(.*):([\w_]+)/, (match, regex, id, end) => {
                    (this.map || (this.map = [])).push(id);
                    return '(' + (regex || '[^\\/]+') + ')';
                });
        });
        this.regex = new RegExp("^" + paths.join('\\/') + "$");
    }

    match(path, search) {
        const match = path.match(this.regex);
        if (match) {
            const location = {
                match: this.regex,
                url: path + search,
                path: path,
                search: search,
                query: qs(search),
                params: {}
            };

            let i = 1;
            const len = match.length;
            if (this.map) {
                for (; i < len; i++) {
                    location.params[this.map[i - 1]] = match[i];
                }
            } else {
                for (; i < len; i++) {
                    location.params[i - 1] = match[i];
                }
            }

            return location;
        }
        return null;
    }
}

class Project {
    state = 0;
    url;
    path;

    constructor(path, url) {
        this.path = new RegExp(path);
        this.url = url;
    }

    async loadResources() {
        var projectUrl = this.url;

        loader.showLoader();

        await loadProject(projectUrl);

        loader.hideLoader();

        this.state = 1;
        this.promise = null;
    }

    async load(path) {
        if (this.path.test(path)) {
            if (this.state === 1) {
                return true;
            }
            return await (this.promise || (this.promise = this.loadResources()));
        }
        return false;
    }
}

export default class RouteManager implements IRouteManager {
    routes: Route[] = [];
    projects = [];

    constructor(projects, routes) {
        this.registerProjects(projects);
        this.registerRoutes(routes);
    }

    registerRoutes(routes) {
        Object.keys(routes).forEach((name) => {
            this.routes.push(new Route(name, routes[name]));
        });
    }

    registerProjects(projects) {
        Object.keys(projects).forEach((path) => {
            this.projects.push(new Project(path, projects[path]));
        });
    }

    async loadProject(path) {
        for (var i = 0; i < this.projects.length; i++) {
            var project = this.projects[i];
            if (await project.load(path)) {
                return;
            }
        }
    }

    async match(url) {
        const routes = this.routes;
        var searchMatch = /\?|!|&/.exec(url);
        var searchIndex = searchMatch ? searchMatch.index : -1;
        var path = (searchIndex === -1 ? url : url.substr(0, searchIndex)).replace(/^#/, '') || '/';
        var search = searchIndex === -1 ? '' : ('?' + url.substr(searchIndex + 1));

        await this.loadProject(path);

        for (let i = 0, len = routes.length; i < len; i++) {
            const location = routes[i].match(path, search);
            if (location) {
                return {
                    route: routes[i],
                    location
                };
            }
        }
        return null;
    }
}