<script setup lang="ts">
import {
  modules,
  useAppController
  // type MenuOptions,
  // type ContextMenuMap,
  // type ContextMenuKeys
} from './app-controller.tsx'

defineOptions({
  name: 'app-controller'
})

const contextmenuRef = useTemplateRef('contextmenuRef')
const appControllerRef = useTemplateRef('appControllerRef')

const {
  activeApp,
  appReflect,
  menuOptions,
  handleResize,
  // activeMenuKey,
  // contextmenuMap,
  contextmenuRect,
  updateActiveKey,
  openContextMenu,
  closeContextMenu,
  contextmenuVisible
} = useAppController(contextmenuRef)

onMounted(function () {
  const appController = appControllerRef.value as HTMLElement

  appController.addEventListener('contextmenu', openContextMenu)
  window.addEventListener('click', closeContextMenu, true)
  window.addEventListener('contextmenu', closeContextMenu, true)
})

onUnmounted(function () {
  const appController = appControllerRef.value as HTMLElement

  appController?.removeEventListener('contextmenu', openContextMenu)
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('contextmenu', closeContextMenu)
})
</script>

<template>
  <div ref="appControllerRef" class="app-controller">
    <TransitionGroup name="app-controller-fade">
      <template v-for="appModule in modules" :key="appModule.id">
        <component
          :app="appModule"
          :is="appReflect[appModule.app]()"
          :data-id="appModule.id"
          :class="['app-item']"
        />
      </template>
    </TransitionGroup>

    <Teleport to="body">
      <ul
        v-resize="handleResize"
        ref="contextmenuRef"
        :class="[
          'globalM-menu',
          'context-menu',
          {
            'is-active': activeApp && contextmenuVisible
          }
        ]"
        @contextmenu.prevent
      >
        <template v-if="menuOptions.length">
          <li
            v-for="item in menuOptions"
            :key="item.key"
            class="context-menu-item shortcut-label"
            @click="updateActiveKey(item)"
          >
            <span class="label-text">
              {{ item.label }}
            </span>
            <component :is="item.icon" class="label-icon" />
          </li>
        </template>
      </ul>
    </Teleport>
    <Teleport to="body">
      <a-drawer :visible="false"></a-drawer>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.app-controller {
  // @apply w-full h-full grid grid-cols-[repeat(auto-fill,70px)] grid-rows-[repeat(auto-fill,70px)] grid-flow-dense justify-center gap-3 rounded-lg;
  @apply mx-auto grid justify-center p-5;
  // @apply overflow-x-hidden overflow-y-scroll;
  @apply grid-flow-row-dense;

  outline: none;
  scrollbar-width: none;
  transition: all 500ms linear;
  row-gap: var(--app-global-row-gap, 30px);
  column-gap: var(--app-global-col-gap, 30px);
  // max-width: var(--app-container-max-width, 1250px);
  grid-template-rows: repeat(auto-fill, var(--app-global-height, 60px));
  grid-template-columns: repeat(auto-fill, var(--app-global-width, 60px));

  &-fade-move,
  &-fade-enter-active,
  &-fade-leave-active {
    transition: all 500ms cubic-bezier(0.455, 0.03, 0.515, 0.955);
  }
  &-fade-enter-from,
  &-fade-leave-to {
    opacity: 0;
    transform: scale(0, 0);
  }

  :deep(:where(.app-item)) {
    @apply relative cursor-pointer text-center;

    & > :where(div:is([class*=' app-'], [class^='app-']):is([class*='-icon '], [class$='-icon'])) {
      @apply w-full h-full transition-all;
    }

    & > span.app-name {
      @apply block truncate w-full mt-1;
      font-size: var(--app-global-text-size);
      color: var(--app-global-text-color);
    }

    & > .app-trash-icon {
      @apply w-5 h-5 absolute -top-[8px] -right-[8px] items-center justify-center bg-[#00000033] rounded-full p-[5px] transition-[background];
      @apply hidden;

      &:hover {
        @apply bg-[#d83030];
      }
    }
  }
}

.context-menu {
  @apply w-40 min-w-40 flex flex-col items-center justify-center gap-y-[6px] z-[9999] fixed bg-[#0b0b0bcc]  rounded-md;

  .is-active {
    @apply p-[6px] border border-solid border-[#0a0a0a33];
  }

  backdrop-filter: blur(8px);
  box-shadow:
    0 0 #0000,
    0 0 #0000,
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);

  left: v-bind('contextmenuRect.x+"px"');
  top: v-bind('contextmenuRect.y+"px"');
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: v-bind('contextmenuVisible ? 1 : 0');
  transform: scale(v-bind('contextmenuVisible ? 1 : 0'));
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
