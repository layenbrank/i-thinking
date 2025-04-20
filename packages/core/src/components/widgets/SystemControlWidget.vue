<script setup lang="ts">
import { ref } from 'vue'

const wifi = ref(true)
const bluetooth = ref(false)
const airplane = ref(false)
const hotspot = ref(false)

function toggleWifi() {
  wifi.value = !wifi.value
}

function toggleBluetooth() {
  bluetooth.value = !bluetooth.value
}

function toggleAirplane() {
  airplane.value = !airplane.value
  if (airplane.value) {
    wifi.value = false
    bluetooth.value = false
    hotspot.value = false
  }
}

function toggleHotspot() {
  hotspot.value = !hotspot.value
}

function openSettings() {
  // 实现打开设置的逻辑
  console.log('Opening settings...')
}

function takeScreenshot() {
  // 实现截图的逻辑
  console.log('Taking screenshot...')
}
</script>

<template>
  <div class="system-control">
    <div class="control-grid">
      <button class="control-button" :class="{ active: wifi }" @click="toggleWifi">
        <div class="icon">📶</div>
        <div class="label">Wi-Fi</div>
      </button>

      <button class="control-button" :class="{ active: bluetooth }" @click="toggleBluetooth">
        <div class="icon">🔵</div>
        <div class="label">Bluetooth</div>
      </button>

      <button class="control-button" :class="{ active: airplane }" @click="toggleAirplane">
        <div class="icon">✈️</div>
        <div class="label">Airplane mode</div>
      </button>

      <button class="control-button" :class="{ active: hotspot }" @click="toggleHotspot">
        <div class="icon">📱</div>
        <div class="label">Hotspot</div>
      </button>

      <button class="control-button" @click="openSettings">
        <div class="icon">⚙️</div>
        <div class="label">Settings</div>
      </button>

      <button class="control-button" @click="takeScreenshot">
        <div class="icon">📸</div>
        <div class="label">Screenshot</div>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.system-control {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 280px;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.control-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 1rem;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  aspect-ratio: 1;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
  }

  &.active {
    background: rgba(255, 255, 255, 0.2);
  }

  .icon {
    font-size: 1.5rem;
  }

  .label {
    font-size: 0.8rem;
    opacity: 0.8;
  }
}
</style>
