
import { Observer } from "../Observer";
import { reactTo } from "./Reaction";

export class Value extends Observer {
    get(keys) {
        reactTo(this);
        return super.get(keys);
    }
}