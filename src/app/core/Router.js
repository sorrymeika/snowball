import { IRouter } from "../types";
import { qs } from "../../utils";
import { loadProject } from "./resource";
import loader from "../../widget/loader";

class Route {
    constructor(name, type) {
        this.name = name;
        this.type = type;

        const paths = name.split('/').map((item) => {
            return !item
                ? ''
                : item.replace(/^(.*):([\w_]+)/, (match, regex, id, end) => {
                    (this.map || (this.map = [])).push(id);
                    return '(' + (regex || '[^\\/]+') + ')';
                });
        });
        this.regex = new RegExp("^" + paths.join('\\/') + "$", 'i');
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
        this.path = new RegExp(path, 'i');
        this.url = url;
    }

    async loadResources() {
        const projectUrl = this.url;

        loader.showLoader();

        await loadProject(projectUrl).catch(e => {
            console.error('项目 `' + projectUrl + '` 加载失败！');
        });

        loader.hideLoader();

        this.state = 1;
        this.promise = null;
    }

    load() {
        if (this.state !== 1) {
            return (this.promise || (this.promise = this.loadResources()));
        }
    }

    match(path) {
        if (this.path.test(path)) {
            return true;
        }
        return false;
    }
}

export default class Router implements IRouter {
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

    loadProject(path) {
        for (let i = 0; i < this.projects.length; i++) {
            let project = this.projects[i];
            if (project.match(path)) {
                return project.load(path);
            }
        }
    }

    match(url) {
        const searchMatch = /\?|!|&/.exec(url);
        const searchIndex = searchMatch ? searchMatch.index : -1;
        const path = (searchIndex === -1 ? url : url.substr(0, searchIndex)).replace(/^#/, '') || '/';
        const search = searchIndex === -1 ? '' : ('?' + url.substr(searchIndex + 1));

        const projectLoader = this.loadProject(path);
        if (projectLoader) {
            return projectLoader.then(() => this._match(path, search));
        } else {
            return this._match(path, search);
        }
    }

    _match(path, search) {
        const routes = this.routes;
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