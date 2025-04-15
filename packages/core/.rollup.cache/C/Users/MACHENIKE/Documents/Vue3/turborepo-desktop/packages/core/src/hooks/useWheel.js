import { computed, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
export function useWheel(options = {}) {
    const { target = window, preventDefault = false, onWheel, step = 100, max = Infinity, min = -Infinity, debug = false } = options;
    const deltaX = ref(0);
    const deltaY = ref(0);
    const deltaZ = ref(0);
    const deltaMode = ref(0);
    const totalX = ref(0);
    const totalY = ref(0);
    const totalZ = ref(0);
    if (debug && max < min) {
        log('warn', 'max should be greater than min');
    }
    function log(type, ...data) {
        if (debug)
            console[type].call(console, ...data);
    }
    const clamp = (value) => Math.min(Math.max(value, min), max);
    const reset = () => {
        totalX.value = 0;
        totalY.value = 0;
        totalZ.value = 0;
        log('log', 'reset wheel state');
    };
    const handler = (event) => {
        if (preventDefault)
            event.preventDefault();
        deltaX.value = Math.sign(event.deltaX) * step;
        deltaY.value = Math.sign(event.deltaY) * step;
        deltaZ.value = Math.sign(event.deltaZ) * step;
        deltaMode.value = event.deltaMode;
        const state = {
            deltaX: deltaX.value,
            deltaY: deltaY.value,
            deltaZ: deltaZ.value,
            deltaMode: deltaMode.value,
            totalX: totalX.value,
            totalY: totalY.value,
            totalZ: totalZ.value
        };
        const shouldUpdate = onWheel?.(event, state);
        if (shouldUpdate !== false) {
            totalX.value = clamp(totalX.value + deltaX.value);
            totalY.value = clamp(totalY.value + deltaY.value);
            totalZ.value = clamp(totalZ.value + deltaZ.value);
        }
        log('table', {
            delta: { x: deltaX.value, y: deltaY.value, z: deltaZ.value },
            total: { x: totalX.value, y: totalY.value, z: totalZ.value }
        });
    };
    useEventListener(target, 'wheel', handler, {
        passive: !preventDefault
    });
    return {
        deltaX: computed(() => deltaX.value),
        deltaY: computed(() => deltaY.value),
        deltaZ: computed(() => deltaZ.value),
        deltaMode: computed(() => deltaMode.value),
        totalX: computed(() => totalX.value),
        totalY: computed(() => totalY.value),
        totalZ: computed(() => totalZ.value),
        reset
    };
}
//# sourceMappingURL=useWheel.js.map