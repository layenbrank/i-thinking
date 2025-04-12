export function generateCvid() {
    const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
    return guid.replace(/-/g, '').toUpperCase();
}
export function generateSecureCvid() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    array[6] = (array[6] & 0x0f) | 0x40;
    array[8] = (array[8] & 0x3f) | 0x80;
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}
//# sourceMappingURL=generate.js.map