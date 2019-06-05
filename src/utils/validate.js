export function validateEmail(email) {
    return /^[-_a-zA-Z0-9\.]+@([-_a-zA-Z0-9]+\.)+[a-zA-Z0-9]{2,3}$/.test(email);
}

export function validateMobile(str) {
    return /^1[0-9]{10}$/.test(str);
}