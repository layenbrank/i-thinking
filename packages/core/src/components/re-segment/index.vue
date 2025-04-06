<script setup lang="ts">
import { ref, nextTick, onMounted, watch, onUnmounted } from "vue";
import type { CSSProperties } from "vue";

defineOptions({
  name: "ReSegment",
});

interface SegmentOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: string;
  tooltip?: string;
}

type Size = "small" | "default" | "large";

const props = withDefaults(
  defineProps<{
    options: SegmentOption[];
    block?: boolean;
    disabled?: boolean;
    size?: Size;
    bordered?: boolean;
    defaultValue?: string | number;
    loading?: boolean;
    customClass?: string;
    customStyle?: string | CSSProperties;
    animation?: boolean;
    theme?: "light" | "dark";
  }>(),
  {
    block: false,
    disabled: false,
    size: "default",
    bordered: true,
    loading: false,
    animation: true,
    theme: "light",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
  change: [value: SegmentOption];
  focus: [value: SegmentOption];
  blur: [value: SegmentOption];
  mouseenter: [e: MouseEvent];
  mouseleave: [e: MouseEvent];
}>();

const thumbStyle = ref({
  left: "0px",
  width: "0px",
});

const modelValue = defineModel<string | number>();
const segmentRef = ref<HTMLElement | null>(null);

async function updatePosition() {
  await nextTick();
  const selectedElement = segmentRef.value?.querySelector(
    ".segment-item.active",
  ) as HTMLElement;

  if (selectedElement) {
    thumbStyle.value = {
      left: selectedElement.offsetLeft + "px",
      width: selectedElement.offsetWidth + "px",
    };
  }
}

function handleSelect(option: SegmentOption, e: MouseEvent) {
  if (props.disabled || option.disabled || props.loading) return;
  modelValue.value = option.value;
  emit("update:modelValue", option.value);
  emit("change", option);
  updatePosition();
}

function handleFocus(option: SegmentOption) {
  if (!props.disabled && !option.disabled) {
    emit("focus", option);
  }
}

function handleBlur(option: SegmentOption) {
  if (!props.disabled && !option.disabled) {
    emit("blur", option);
  }
}

function handleMouseEnter(e: MouseEvent) {
  if (!props.disabled) {
    emit("mouseenter", e);
  }
}

function handleMouseLeave(e: MouseEvent) {
  if (!props.disabled) {
    emit("mouseleave", e);
  }
}

// 监听主题变化
watch(() => props.theme, updatePosition);

// 监听窗口大小变化，更新滑块位置
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  // 设置默认值
  if (!modelValue.value && props.defaultValue) {
    modelValue.value = props.defaultValue;
  } else if (!modelValue.value && props.options.length > 0) {
    modelValue.value = props.options[0].value;
    emit("change", props.options[0]);
  }

  updatePosition();

  // 监听容器大小变化
  if (segmentRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });
    resizeObserver.observe(segmentRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div
    ref="segmentRef"
    class="re-segment"
    :class="[
      `re-segment--${size}`,
      `re-segment--${theme}`,
      {
        'is-block': block,
        'is-disabled': disabled,
        'is-bordered': bordered,
        'is-loading': loading,
        'no-animation': !animation,
      },
      customClass,
    ]"
    :style="customStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="segment-inner">
      <div v-if="animation" class="segment-thumb" :style="thumbStyle" />
      <div
        v-for="option in options"
        :key="option.value"
        class="segment-item"
        :class="{
          active: option.value === modelValue,
          disabled: option.disabled,
        }"
        :title="option.tooltip"
        @click="(e) => handleSelect(option, e)"
        @focus="() => handleFocus(option)"
        @blur="() => handleBlur(option)"
      >
        <slot name="item" :option="option">
          <span v-if="option.icon" class="segment-item__icon">
            <slot name="icon" :icon="option.icon">
              <i :class="option.icon" />
            </slot>
          </span>
          <span class="segment-item__label">{{ option.label }}</span>
        </slot>
      </div>
    </div>
    <slot name="loading" v-if="loading">
      <div class="segment-loading">
        <div class="segment-loading__spinner" />
      </div>
    </slot>
  </div>
</template>

<style lang="scss" scoped>
.re-segment {
  display: inline-block;
  box-sizing: border-box;
  margin: 0;
  font-size: 14px;
  line-height: 1.5714285714285714;
  list-style: none;
  background: var(--segment-bg, #f0f0f0);
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
  user-select: none;
  padding: 2px;

  // 主题相关
  &--light {
    --segment-bg: #f0f0f0;
    --segment-color: rgba(0, 0, 0, 0.88);
    --segment-hover-color: rgba(0, 0, 0, 0.88);
    --segment-active-bg: #fff;
    --segment-active-color: rgba(0, 0, 0, 0.88);
    --segment-disabled-color: rgba(0, 0, 0, 0.25);
    --segment-disabled-bg: rgba(0, 0, 0, 0.04);
    --segment-border-color: rgba(0, 0, 0, 0.06);
  }

  &--dark {
    --segment-bg: rgba(255, 255, 255, 0.08);
    --segment-color: rgba(255, 255, 255, 0.65);
    --segment-hover-color: rgba(255, 255, 255, 0.85);
    --segment-active-bg: rgba(255, 255, 255, 0.12);
    --segment-active-color: rgba(255, 255, 255, 0.95);
    --segment-disabled-color: rgba(255, 255, 255, 0.25);
    --segment-disabled-bg: rgba(255, 255, 255, 0.08);
    --segment-border-color: rgba(255, 255, 255, 0.12);
  }

  // 尺寸相关
  &--small {
    .segment-item {
      padding: 0 7px;
      font-size: 14px;
      line-height: 24px;
      height: 24px;
    }
  }

  &--default {
    .segment-item {
      padding: 0 11px;
      font-size: 14px;
      line-height: 30px;
      height: 30px;
    }
  }

  &--large {
    .segment-item {
      padding: 0 15px;
      font-size: 16px;
      line-height: 36px;
      height: 36px;
    }
  }

  &.is-block {
    display: flex;
    width: 100%;

    .segment-inner {
      flex: 1;
    }
  }

  &.is-disabled {
    cursor: not-allowed;
    background: var(--segment-disabled-bg);

    .segment-item {
      color: var(--segment-disabled-color);
      cursor: not-allowed;

      &:hover {
        color: var(--segment-disabled-color);
      }
    }
  }

  &.is-bordered {
    border: 1px solid var(--segment-border-color);
  }

  &.is-loading {
    pointer-events: none;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background: rgba(255, 255, 255, 0.45);
      border-radius: 6px;
    }
  }

  &.no-animation {
    .segment-item {
      transition: none;

      &.active {
        background-color: var(--segment-active-bg);
      }
    }
  }

  .segment-inner {
    position: relative;
    display: flex;
    width: 100%;
  }

  .segment-thumb {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background-color: var(--segment-active-bg);
    border-radius: 4px;
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.08);
    transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
    z-index: 1;
  }

  .segment-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--segment-color);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
    z-index: 2;
    border-radius: 4px;
    margin: 0;
    min-width: 32px;

    &:hover:not(.disabled):not(.active) {
      color: var(--segment-hover-color);
    }

    &.active {
      color: var(--segment-active-color);
      font-weight: 500;
    }

    &.disabled {
      color: var(--segment-disabled-color);
      cursor: not-allowed;
      background: transparent;
    }

    &__icon {
      display: flex;
      align-items: center;
      margin-right: 6px;
      font-size: 14px;

      &:only-child {
        margin-right: 0;
      }
    }

    &__label {
      line-height: 1;
    }
  }

  .segment-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;

    &__spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--segment-active-color);
      border-top-color: transparent;
      border-radius: 50%;
      animation: segment-spin 0.8s linear infinite;
    }
  }
}

@keyframes segment-spin {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
