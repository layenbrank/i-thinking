const map = new WeakMap();
const ob = new ResizeObserver(function (entries) {
    for (const entry of entries) {
        const target = entry.target;
        const handler = map.get(target);
        const DOMRect = target.getBoundingClientRect();
        handler?.(DOMRect);
    }
});
export const resize = {
    mounted(el, binding) {
        map.set(el, binding.value);
        ob.observe(el);
    },
    beforeUnmount(el) {
        ob.unobserve(el);
    },
};
//# sourceMappingURL=resize.js.map