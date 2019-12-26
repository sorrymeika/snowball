import { mixin } from "../../utils";

export function configuration(...configurations) {
    return mixin(...configurations);
}