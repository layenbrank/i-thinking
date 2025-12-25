<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 模拟天气数据
const temperature = ref(23)
const weatherIcon = ref('☀️')
const weatherText = ref('晴朗')
const location = ref('北京市')

const forecast = ref([
  { name: '今天', icon: '☀️', temp: 23, date: '2024-03-20' },
  { name: '周四', icon: '⛅️', temp: 22, date: '2024-03-21' },
  { name: '周五', icon: '🌧️', temp: 20, date: '2024-03-22' },
  { name: '周六', icon: '⛅️', temp: 21, date: '2024-03-23' },
  { name: '周日', icon: '☀️', temp: 24, date: '2024-03-24' }
])

// 这里可以添加实际的天气 API 调用
onMounted(() => {
  // fetchWeatherData();
})
</script>

<template>
  <div class="weather-widget">
    <div class="current-weather">
      <div class="temperature">{{ temperature }}°</div>
      <div class="weather-info">
        <div class="weather-icon">{{ weatherIcon }}</div>
        <div class="weather-text">{{ weatherText }}</div>
      </div>
    </div>
    <div class="location">{{ location }}</div>
    <div class="forecast">
      <div
        v-for="day in forecast"
        :key="day.date"
        class="forecast-day">
        <div class="day-name">{{ day.name }}</div>
        <div class="day-icon">{{ day.icon }}</div>
        <div class="day-temp">{{ day.temp }}°</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.weather-widget {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.current-weather {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.temperature {
  font-size: 3rem;
  font-weight: 200;
  line-height: 1;
}

.weather-info {
  text-align: right;
}

.weather-icon {
  font-size: 2rem;
}

.weather-text {
  font-size: 0.9rem;
  opacity: 0.8;
}

.location {
  font-size: 1.1rem;
  font-weight: 500;
}

.forecast {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.forecast-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  text-align: center;

  .day-name {
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .day-icon {
    font-size: 1.5rem;
  }

  .day-temp {
    font-size: 0.9rem;
  }
}
</style>
