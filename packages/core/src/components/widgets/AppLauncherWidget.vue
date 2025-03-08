<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')

const apps = [
  { id: 'settings', name: 'Settings', icon: '⚙️', command: 'settings' },
  { id: 'photos', name: 'Photos', icon: '🖼️', command: 'photos' },
  { id: 'calculator', name: 'Calculator', icon: '🧮', command: 'calc' },
  { id: 'mail', name: 'Mail', icon: '✉️', command: 'mail' },
  { id: 'terminal', name: 'Terminal', icon: '💻', command: 'terminal' },
  { id: 'calendar', name: 'Calendar', icon: '📅', command: 'calendar' },
  { id: 'github', name: 'Github', icon: '🐱', command: 'github' },
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖', command: 'chatgpt' },
  { id: 'whatsapp', name: 'Whatsapp', icon: '💬', command: 'whatsapp' },
  { id: 'twitter', name: 'X / Twitter', icon: '🐦', command: 'twitter' }
]

const filteredApps = computed(() => {
  if (!searchQuery.value) return apps
  const query = searchQuery.value.toLowerCase()
  return apps.filter(
    app => app.name.toLowerCase().includes(query) || app.command.toLowerCase().includes(query)
  )
})

const launchApp = (app: (typeof apps)[0]) => {
  // 这里可以添加实际的应用启动逻辑
  console.log(`Launching ${app.name}`)
}
</script>

<template>
  <div class="app-launcher">
    <div class="search-bar">
      <input type="text" v-model="searchQuery" placeholder="Search This PC" class="search-input" />
    </div>

    <div class="app-grid">
      <div v-for="app in filteredApps" :key="app.id" class="app-item" @click="launchApp(app)">
        <div class="app-icon">{{ app.icon }}</div>
        <div class="app-name">{{ app.name }}</div>
      </div>
    </div>

    <div class="quick-access">
      <div class="quick-access-row">
        <div class="quick-folder">
          <div class="folder-icon">⬇️</div>
          <div class="folder-name">Downloads</div>
        </div>
        <div class="quick-folder">
          <div class="folder-icon">📄</div>
          <div class="folder-name">Documents</div>
        </div>
      </div>
      <div class="quick-access-row">
        <div class="quick-folder">
          <div class="folder-icon">🖼️</div>
          <div class="folder-name">Pictures</div>
        </div>
        <div class="quick-folder">
          <div class="folder-icon">🎵</div>
          <div class="folder-name">Music</div>
        </div>
      </div>
    </div>

    <div class="system-info">
      <div class="storage-info">
        <span>358GB/476GB</span>
        <div class="storage-bar">
          <div class="storage-used" style="width: 75%"></div>
        </div>
      </div>
      <div class="memory-info">
        <span>4GB/8GB</span>
        <div class="memory-bar">
          <div class="memory-used" style="width: 50%"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-launcher {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-width: 280px;
}

.search-bar {
  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 1.5rem;
    background: rgba(255, 255, 255, 0.1);
    color: inherit;
    font-size: 0.9rem;
    backdrop-filter: blur(10px);

    &::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }

    &:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.15);
    }
  }
}

.app-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.app-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 0.75rem;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .app-icon {
    font-size: 1.2rem;
    width: 1.5rem;
    text-align: center;
  }

  .app-name {
    font-size: 0.9rem;
    opacity: 0.9;
  }
}

.quick-access {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;

  .quick-access-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
}

.quick-folder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .folder-icon {
    font-size: 1.2rem;
  }

  .folder-name {
    font-size: 0.9rem;
  }
}

.system-info {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .storage-info,
  .memory-info {
    span {
      font-size: 0.8rem;
      opacity: 0.8;
    }
  }

  .storage-bar,
  .memory-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    margin-top: 0.25rem;
    overflow: hidden;

    .storage-used,
    .memory-used {
      height: 100%;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 2px;
    }
  }
}
</style>
