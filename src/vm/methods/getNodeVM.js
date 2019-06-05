export function getNodeVM(node) {
    for (; node; node = node.parentNode) {
        if (node.snViewModel) {
            return node.snViewModel;
        }
    }
}