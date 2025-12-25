<script setup lang="tsx">
import { useMirror } from '@/hooks/mirror'
import { useMirrorStore } from '@/stores/mirror.ts'
import { message } from 'ant-design-vue'
import MarketplaceSwiper from './marketplace-swiper.vue'

defineOptions({
  name: 'marketplace-application'
})

const props = withDefaults(
  defineProps<{
    applications: Application[]
  }>(),
  {}
)

const store = useMirrorStore()
const { APPLICATION } = useMirror()

const options = ref([
  {
    label: '主页',
    key: 'portal',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel1.jpeg'
  },
  {
    label: '应用',
    key: 'application',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel2.jpeg'
  },
  {
    label: '游戏',
    key: 'game',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel3.jpeg'
  },
  {
    label: 'AI Hub',
    key: 'ai',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel4.jpeg'
  },
  {
    label: '自定义',
    key: 'customization',
    image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel5.jpeg'
  }
])

const hasMultiple = computed(() => props.applications.length > 1)

async function toInsertApplication(event: MouseEvent) {
  const target = event.target as HTMLElement
  const closest = target.closest('.application')
  if (!closest) return
  const ID = closest.getAttribute('data-id')
  if (!ID) return
  const application = props.applications.find((application) => application.id === ID)
  if (!application) return
  if (!store.mirrorID) return
  try {
    await store?.toInsertApplication([
      Object.assign(application, {
        id: crypto.randomUUID(),
        mirrorID: store.mirrorID ?? '',
        title: application.title,
        index: store.applications?.length ?? 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    ])

    message.success('应用已添加到桌面')
  } catch {
    message.error('应用添加失败，请重试')
  }
}
</script>

<template>
  <div
    @click="toInsertApplication"
    @dblclick.capture.stop.prevent
    class="marketplace-application">
    <MarketplaceSwiper
      :options="options"
      :loop="hasMultiple">
      <template #slide="{ option }">
        <div class="image-container">
          <img
            :src="option.image"
            alt=""
            class="carousel-img" />
        </div>
      </template>
      <template #main>
        <h3>热门应用</h3>
        <TransitionGroup
          tag="div"
          name="application-fade"
          class="controller mini rectangle horizontal">
          <template
            v-for="application in applications"
            :key="application.id">
            <component
              size="mini"
              direction="horizontal"
              shape="rectangle"
              :class="['application']"
              :settings-visible="false"
              :data-id="application.id"
              :application="application"
              :is="APPLICATION[application.component]" />
          </template>
        </TransitionGroup>
      </template>
    </MarketplaceSwiper>
  </div>
</template>

<style lang="scss" scoped>
.marketplace-application {
  .controller {
    @extend %controller;
  }

  .image-container {
    @apply w-full h-full flex items-center justify-center rounded-lg overflow-hidden;
    backdrop-filter: blur(60px);
    background-color: rgba(0, 0, 0, 0.52);
  }

  .carousel-img {
    @apply h-full object-contain rounded-lg;
  }
}
</style>
