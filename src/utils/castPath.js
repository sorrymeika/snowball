export function castPath(path) {
    return path.replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .filter((name) => name);
}