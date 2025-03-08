<script setup lang="ts">
import { ref } from 'vue'

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(180) // 3 minutes in seconds
const progress = ref(0)

const currentTrack = ref({
  name: 'NO LOVE',
  artist: 'N/A',
  coverUrl: ''
})

const togglePlay = () => {
  isPlaying.value = !isPlaying.value
}

const previous = () => {
  console.log('Previous track')
}

const next = () => {
  console.log('Next track')
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 模拟进度更新
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (isPlaying.value) {
      currentTime.value = (currentTime.value + 1) % duration.value
      progress.value = (currentTime.value / duration.value) * 100
    }
  }, 1000)
}
</script>

<template>
  <div class="music-player">
    <div class="now-playing">
      <div class="cover-art" :style="{ backgroundImage: `url(${currentTrack.coverUrl})` }">
        <div class="default-cover">🎵</div>
      </div>
      <div class="track-info">
        <div class="track-name">{{ currentTrack.name || 'N/A' }}</div>
        <div class="artist">{{ currentTrack.artist || 'No track playing' }}</div>
      </div>
    </div>

    <div class="controls">
      <button class="control-button" @click="previous">
        <span class="icon">⏮</span>
      </button>
      <button class="control-button play-pause" @click="togglePlay">
        <span class="icon">{{ isPlaying ? '⏸' : '▶️' }}</span>
      </button>
      <button class="control-button" @click="next">
        <span class="icon">⏭</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.music-player {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 280px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 1rem;
}

.now-playing {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.cover-art {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;

  .default-cover {
    font-size: 2rem;
    opacity: 0.5;
  }
}

.track-info {
  flex: 1;
  min-width: 0;

  .track-name {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .artist {
    font-size: 0.9rem;
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.control-button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 999px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .icon {
    font-size: 1.5rem;
    display: block;
  }

  &.play-pause {
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }
  }
}
</style>
