<script setup lang="ts">
import { createTheme, inputDark, datePickerDark, useOsTheme } from 'naive-ui'
// locale & dateLocale
import { zhCN, dateZhCN } from 'naive-ui'

const darkTheme = createTheme([inputDark, datePickerDark])

defineOptions({
  name: 'App'
})
const osThemeRef = useOsTheme()
const theme = computed(() => (osThemeRef.value === 'dark' ? darkTheme : null))
const osTheme = ref(osThemeRef)
const loading = ref(false)
</script>

<template>
  <n-config-provider :theme="theme" :locale="zhCN" :date-locale="dateZhCN" class="config-provider">
    <n-message-provider>
      <n-dialog-provider>
        <n-modal-provider>
          <n-loading-bar-provider>
            <n-notification-provider>
              <n-spin :show="loading" class="global-spin-loading">
                <n-global-style />
                <router-view />
              </n-spin>
            </n-notification-provider>
          </n-loading-bar-provider>
        </n-modal-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style lang="scss" scoped>
%full-screen {
  width: 100%;
  height: 100%;
}

.config-provider {
  @extend %full-screen;

  .global-spin-loading {
    @extend %full-screen;

    :deep(.n-spin-content) {
      @extend %full-screen;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>
