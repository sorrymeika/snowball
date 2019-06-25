import { controller, injectable, navigation } from "snowball/app";
import Home from "../containers/Home";

@controller('/', Home)
class HomeController {
    constructor({ location }, context) {
        console.log(location);
    }

    onInit() {
        // fetch remote data here!
    }

    @injectable
    onButtonClick() {
        navigation.forward('/test');
    }
}

export default HomeController;
