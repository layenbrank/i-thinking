import { ref, watch, onMounted, onUnmounted, isRef } from 'vue';
import { Observable, Subject, from, timer, animationFrameScheduler } from 'rxjs';
import { takeUntil, takeWhile, tap, scan, map, concatMap, take } from 'rxjs/operators';
export function useDeferredRender(options) {
    const optionsRef = isRef(options) ? options : ref(options);
    const config = ref({
        ...optionsRef.value
    });
    const renderedTasks = ref(0);
    const isRendering = ref(false);
    const destroy$ = new Subject();
    watch(() => optionsRef.value, (opts) => {
        config.value = opts;
        if (opts.taskCount && opts.taskCount !== renderedTasks.value) {
            resetRendering();
        }
    }, {
        deep: true
    });
    function resetRendering() {
        renderedTasks.value = 0;
        if (config.value.taskCount > 0) {
            startRendering();
        }
    }
    function startRendering() {
        if (isRendering.value)
            destroy$.next();
        isRendering.value = true;
        timer(0, 0, animationFrameScheduler)
            .pipe(takeUntil(destroy$), takeWhile(() => renderedTasks.value < config.value.taskCount), concatMap(() => {
            const remainingTasks = config.value.taskCount - renderedTasks.value;
            const tasksThisFrame = Math.min(config.value.taskSize, remainingTasks);
            return from([...Array(tasksThisFrame)]).pipe(scan((acc) => acc + 1, renderedTasks.value), tap((value) => {
                renderedTasks.value = value;
            }), take(tasksThisFrame));
        }))
            .subscribe({
            complete: () => {
                isRendering.value = false;
            }
        });
    }
    function updateOptions(opts) {
        if (isRef(options)) {
            options.value = { ...options.value, ...opts };
        }
        else {
            optionsRef.value = { ...optionsRef.value, ...opts };
        }
        config.value = {
            ...config.value,
            ...opts
        };
        if (opts.taskCount && opts.taskCount !== renderedTasks.value) {
            resetRendering();
        }
    }
    function isRender(index) {
        return index < renderedTasks.value;
    }
    onMounted(() => {
        if (config.value.taskCount > 0)
            startRendering();
    });
    onUnmounted(() => {
        destroy$.next();
        destroy$.complete();
    });
    return {
        renderedTasks,
        isRendering,
        isRender,
        updateOptions,
        resetRendering
    };
}
//# sourceMappingURL=deferred-render.js.map