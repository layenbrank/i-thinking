export const debounce = {
    beforeMount(el, binding) {
        el.addEventListener("click", function () {
            if (!el.disabled) {
                el.disabled = true;
                setTimeout(() => {
                    el.disabled = false;
                }, binding.value || 2 * 1000);
            }
        });
    },
    unmounted(el) {
        el.removeEventListener("click", () => null);
    },
};
//# sourceMappingURL=debounce.js.map