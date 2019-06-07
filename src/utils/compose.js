export const compose = (...funcs) =>
    funcs.reduce((a, b) => (...args) => a(b(...args)), arg => arg);