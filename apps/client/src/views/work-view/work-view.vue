<script setup lang="ts">
import router from '@/routers/index.ts'
import {
  PieChartOutlined,
  DesktopOutlined,
  UserOutlined,
  TeamOutlined,
  FileOutlined,
  MailOutlined,
  AppstoreOutlined,
  SettingOutlined
} from '@ant-design/icons-vue'
import { message, type ItemType, type MenuProps } from 'ant-design-vue'

defineOptions({
  name: 'work-view'
})

const route = useRoute()

const collapsed = ref<boolean>(false)
const openKeys = ref<string[]>(['file-processing'])
const selectedKeys = ref<string[]>(['monitor-changes'])

const menuOptions: ItemType[] = reactive([
  {
    label: '文件处理',
    key: 'file-processing',
    icon: () => h(MailOutlined),
    children: [
      {
        label: '监测变化',
        key: 'monitor-changes',
        onClick(e) {
          router.push({ name: 'monitor-changes' })
        }
      },
      {
        label: '生成路径',
        key: 'generate-path',
        onClick(e) {
          router.push({ name: 'generate-path' })
        }
      }
    ]
  },
  {
    label: 'Navigation Two',
    key: 'sub2',
    icon: () => h(AppstoreOutlined),
    children: [
      { label: 'Option 5', key: '5' },
      { label: 'Option 6', key: '6' },
      {
        label: 'Submenu',
        key: 'sub3',
        children: [
          { label: 'Option 7', key: '7' },
          { label: 'Option 8', key: '8' }
        ]
      }
    ]
  },
  {
    type: 'divider'
  },
  {
    label: 'Navigation Three',
    key: 'sub4',
    icon: () => h(SettingOutlined),
    children: [
      { label: 'Option 9', key: '9' },
      { label: 'Option 10', key: '10' },
      { label: 'Option 11', key: '11' },
      { label: 'Option 12', key: '12' }
    ]
  }
])

const handleClick: MenuProps['onClick'] = function (e) {
  // console.log('click', e)
  // console.log('openKeys', openKeys.value)
  // console.log('selectedKeys', selectedKeys.value)
  // router.hasRoute(e.key as string) && router.push(e.key as string)
}

onMounted(function () {
  const [routeName] = selectedKeys.value
  router.push({ name: routeName })
})
</script>

<template>
  <a-layout class="work-view">
    <a-layout-sider v-model:collapsed="collapsed" collapsible theme="light" class="work-sider">
      <div class="logo" />
      <a-menu
        theme="light"
        mode="inline"
        v-model:openKeys="openKeys"
        v-model:selectedKeys="selectedKeys"
        :items="menuOptions"
        @click="handleClick"
      ></a-menu>
    </a-layout-sider>
    <a-layout class="work-main">
      <a-layout-header class="work-header">
        <a-breadcrumb style="margin: 16px 0">
          <a-breadcrumb-item>User</a-breadcrumb-item>
          <a-breadcrumb-item>Bill</a-breadcrumb-item>
        </a-breadcrumb>
      </a-layout-header>
      <a-layout-content class="work-content">
        <router-view />
      </a-layout-content>
      <a-layout-footer class="work-footer"> Ant Design ©2018 Created by Ant UED </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<style lang="scss" scoped>
.work-view {
  @apply w-full h-full;

  .work-sider {
    @apply bg-gray-300 bg-opacity-30;
  }

  .work-main {
    @apply w-full h-full bg-white;
  }

  .work-header {
    @apply bg-white;
    padding-inline: 20px;
  }

  .work-content {
  }

  .work-footer {
    @apply text-center;
  }
}
</style>
