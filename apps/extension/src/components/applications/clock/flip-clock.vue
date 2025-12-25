<script setup lang="ts">
import { formatTimeToDigits, getNextTickDelay } from './clock.ts'
import FlipDigit from './flip-digit.vue'

const timeDigits = ref<number[]>(formatTimeToDigits())
let clockTimer: number

function updateClock() {
  const delay = getNextTickDelay()

  timeDigits.value = formatTimeToDigits()

  clockTimer = window.setTimeout(() => {
    updateClock()
  }, delay)
}

// 初始同步
function syncClock() {
  const delay = getNextTickDelay()
  clockTimer = window.setTimeout(() => {
    updateClock()
  }, delay)
}

onMounted(() => {
  syncClock() // 首次同步
})

onUnmounted(() => {
  clearTimeout(clockTimer)
})
</script>

<template>
  <div class="flip-clock digital-clock">
    <!-- 小时 -->
    <FlipDigit
      :total="2"
      :current="timeDigits[0]"
      class="flip-clock__hours" />
    <FlipDigit
      :total="9"
      :current="timeDigits[1]"
      class="flip-clock__hours" />

    <div class="time-separator flip-clock__separator-minutes"></div>

    <!-- 分钟 -->
    <FlipDigit
      :total="5"
      :current="timeDigits[2]"
      class="flip-clock__minutes" />
    <FlipDigit
      :total="9"
      :current="timeDigits[3]"
      class="flip-clock__minutes" />

    <div class="time-separator flip-clock__separator-seconds"></div>

    <!-- 秒钟 -->
    <FlipDigit
      :total="5"
      :current="timeDigits[4]"
      class="flip-clock__seconds" />
    <FlipDigit
      :total="9"
      :current="timeDigits[5]"
      class="flip-clock__seconds" />
  </div>
</template>

<style lang="scss" scoped>
.digital-clock {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #000000;
  border-radius: 8px;
}

.time-separator {
  height: 50px;
  padding: 0 10px;
  display: flex;
  justify-content: space-around;
  flex-direction: column;

  &::before,
  &::after {
    content: '';
    display: block;
    width: 10px;
    height: 10px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 50%;
  }
}
</style>
