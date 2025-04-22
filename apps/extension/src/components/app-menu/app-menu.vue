<script setup lang="ts">
import type { MenuOptions } from '@/types/app-menu'

defineOptions({
  name: 'app-menu'
})

const props = withDefaults(
  defineProps<{
    options: MenuOptions[]
    // activeKey: ContextMenuKeys
    x: number
    y: number
  }>(),
  {}
)

const emits = defineEmits<{
  (e: 'update:activeKey', value: MenuOptions): void
}>()

const visible = defineModel('visible', {
  default: false,
  type: Boolean
})
</script>

<template>
  <ul :class="['app-menu context-menu']">
    <template v-if="options.length">
      <li
        :key="menu.key"
        v-for="menu in options"
        class="context-menu-item shortcut-label"
        @click="emits('update:activeKey', menu)"
      >
        <span class="label-text">
          {{ menu.label }}
        </span>
        <component :is="menu.icon" class="label-icon" />
      </li>
    </template>
  </ul>
</template>

<style lang="scss" scoped>
.app-menu.context-menu {
  @apply w-40 min-w-40 flex flex-col items-center justify-center gap-y-[6px] z-[9999] fixed bg-[#0b0b0bcc]  rounded-md;

  &.is-active {
    @apply p-[6px];
  }

  backdrop-filter: blur(8px);
  box-shadow:
    0 0 #0000,
    0 0 #0000,
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);

  left: v-bind('x+"px"');
  top: v-bind('y+"px"');
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: v-bind('visible ? 1 : 0');
  transform: scale(v-bind('visible ? 1 : 0'));
  transform-origin: 0 0;

  .context-menu-item {
    @apply w-full flex items-center justify-between text-white text-xs leading-none px-2 py-2 rounded-[4px] cursor-pointer relative;

    &:hover {
      @apply bg-[#ffffff1a];
    }

    .label-text {
    }

    .label-icon {
      @apply w-4 h-4 text-white;
    }
  }
}
</style>
