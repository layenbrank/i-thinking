<script setup lang="tsx">
import { useMirror } from '@/hooks/mirror.ts'
import { useMirrorStore } from '@/stores/mirror.ts'

import { useI18n } from 'vue-i18n'
import MarketplaceAihub from './marketplace-aihub.vue'
import MarketplaceApplication from './marketplace-application.vue'
import MarketplaceCustomization from './marketplace-customization.vue'
import MarketplaceGame from './marketplace-game.vue'

type ReflectComponent = 'application' | 'game' | 'ai' | 'customization'

interface GeneralOptions {
  label: string
  key: ReflectComponent
}

defineOptions({
  name: 'marketplace-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})

const store = useMirrorStore()
const { t } = useI18n()

const { APPLICATIONS } = useMirror()

const activeKey = ref<GeneralOptions>({
  label: t('General.Application'),
  key: 'application'
})

const reflect: Record<ReflectComponent, Component> = {
  ai: MarketplaceAihub,
  game: MarketplaceGame,
  application: MarketplaceApplication,
  customization: MarketplaceCustomization
}

const options: GeneralOptions[] = [
  {
    label: t('General.Application'),
    key: 'application'
  },
  {
    label: t('General.Game'),
    key: 'game'
  },
  {
    label: t('General.AI-Hub'),
    key: 'ai'
  },
  {
    label: t('General.Customization'),
    key: 'customization'
  }
]

function updateActiveKey(item: GeneralOptions) {
  activeKey.value = item
}
</script>

<template>
  <div class="marketplace-overlay">
    <div class="marketplace-categories">
      <div
        :key="option.key"
        v-for="option in options"
        @click="updateActiveKey(option)"
        :class="[
          'marketplace-category',
          {
            'is-active': activeKey.key === option.key
          }
        ]">
        {{ option.label }}
      </div>
    </div>
    <div class="marketplace-content">
      <template v-for="option in options">
        <component
          :key="option.key"
          class="content-item"
          :is="reflect[activeKey.key]"
          v-if="activeKey.key === option.key"
          :applications="APPLICATIONS"></component>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.marketplace-overlay {
  @apply h-full flex justify-between gap-x-2;

  .marketplace-categories {
    @apply w-20 h-full flex flex-col items-center gap-y-1 rounded-l-lg overflow-x-hidden overflow-y-scroll  bg-[#fbeff5] p-2;
    scrollbar-width: none;

    .marketplace-category {
      @apply w-full px-2 py-2 text-center rounded-md cursor-pointer transition-all duration-300;

      &:hover,
      &.is-active {
        @apply bg-white;
      }
    }
  }

  .marketplace-content {
    @apply flex-1 rounded-r-lg overflow-x-hidden overflow-y-scroll pt-2 pr-2 pb-2;
    scrollbar-width: none;
    // --swiper-navigation-size: 30px;

    .content-item {
      @apply w-full h-full overflow-x-hidden overflow-y-scroll;
    }
  }
}
</style>
