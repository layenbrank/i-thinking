<script setup lang="ts">
import AppMenu from '../app-menu/app-menu.vue'
import AppDrawer from '../app-drawer/app-drawer.vue'
import { useSlidesStore } from '@/stores/slides.ts'

import {
  useAppController
  // type MenuOptions,
  // type ContextMenuMap,
  // type ContextMenuKeys
} from './app-controller.tsx'

defineOptions({
  name: 'app-controller'
})

const slidesStore = useSlidesStore()

const contextmenuRef = useTemplateRef('contextmenuRef')
const appControllerRef = useTemplateRef('appControllerRef')

const {
  activeApp,
  appReflect,
  menuOptions,
  // handleResize,
  // activeMenuKey,
  // contextmenuMap,
  drawerVisible,
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
      <template v-for="slide in slidesStore.slides" :key="slide.id">
        <component
          :app="slide"
          :is="appReflect[slide.app]()"
          :data-id="slide.id"
          :class="['slide-app']"
        />
      </template>
    </TransitionGroup>

    <AppDrawer
      :slideApp="activeApp"
      :title="null"
      :mask="false"
      placement="right"
      :closable="true"
      v-model:open="drawerVisible"
    />

    <Teleport to="body">
      <AppMenu
        ref="contextmenuRef"
        :x="contextmenuRect.x"
        :y="contextmenuRect.y"
        :options="menuOptions"
        v-model:visible="contextmenuVisible"
        @update:active-key="updateActiveKey"
        @contextmenu.prevent="openContextMenu"
        :class="[
          {
            'is-active': activeApp && contextmenuVisible
          }
        ]"
      />
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.app-controller {
  @apply mx-auto grid justify-center p-5;
  @apply grid-flow-row-dense;

  outline: none;
  scrollbar-width: none;
  transition: all 500ms linear;
  row-gap: var(--app-global-row-gap, 30px);
  column-gap: var(--app-global-col-gap, 30px);
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

  :deep(:where(.slide-app)) {
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
</style>
