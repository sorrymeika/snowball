
export default class CompilerManager {
    constructor(compilers) {
        this.compilers = compilers;
    }

    reduce($elements) {
        var compilers = this.compilers;
        for (var i = 0; i < compilers.length; i++) {
            if (compilers[i].compile($elements) === false) {
                return;
            }
        }
    }
}