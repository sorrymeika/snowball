export function contains(source, keywords) {
    return !keywords || source.indexOf(keywords) != -1;
}

export function like(source, keywords) {
    source = source.toLowerCase();
    keywords = keywords.toLowerCase();
    return !keywords || source.indexOf(keywords) != -1 || keywords.indexOf(source) != -1;
}