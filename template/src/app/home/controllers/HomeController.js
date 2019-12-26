import { controller } from "snowball/app";
import Home from "../containers/Home";

@controller(Home)
class HomeController {
    constructor({ location }, context) {
        console.log(location);
    }

    onInit() {
        // fetch remote data here!
    }

    onButtonClick() {
        this.ctx.navigation.forward('/test');
    }
}

export default HomeController;
