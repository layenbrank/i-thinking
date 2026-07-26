<script setup lang="ts">
import { useAiStore } from '@/stores/intelligence.ts'
import { Icon } from '@iconify/vue'

defineOptions({
  name: 'collection-entry'
})

const store = useAiStore()

const keyword = ref('')
const operation = ref<'increment' | 'match'>('increment')

function toInsertSession() {
  void store.toInsertSession().then(function (response) {
    console.log('[toInsertSession]', response)
  })
}

function toggleSession(e: MouseEvent) {
  const target = e.target as HTMLElement
  const id = target.dataset.id
  if (!id) return
  const session = store.sessions?.find(function (session) {
    return session.id === id
  })
  if (!session) return
  store.session = session
}
</script>

<template>
  <div class="collection-entry">
    <div
      :class="[
        'collection-operations',
        {
          'is-increment': operation === 'increment'
        }
      ]">
      <div class="operations-section">
        <a-button
          @click="toInsertSession"
          block
          class="increment-button"
          >新增对话</a-button
        >
        <a-input
          v-model:value="keyword"
          type="text"
          class="match-composer"></a-input>
      </div>
      <a-button
        v-if="operation === 'increment'"
        @click="operation = 'match'"
        class="operation-toggle toggle-increment">
        <Icon
          icon="mdi:plus-circle-outline"
          class="increment-mark" />
      </a-button>
      <a-button
        v-else
        @click="operation = 'increment'"
        class="operation-toggle toggle-match">
        <Icon
          icon="mdi:magnify"
          class="match-mark" />
      </a-button>
    </div>
    <div class="collection-entries">
      <div class="collection-scroll">
        <div
          @click="toggleSession"
          class="collection-layout">
          <div
            :data-id="session.id"
            v-for="session in store.sessions"
            :key="session.id"
            :class="[
              'single-entry',
              {
                'is-active': store.session?.id === session.id
              }
            ]">
            {{ session.title }}-{{ session.id }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.collection-entry {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-block: 8px;
  row-gap: 8px;
  background-color: #ffffff;

  .collection-operations {
    height: 32px;
    display: flex;
    flex-direction: row;
    column-gap: 6px;
    padding-inline: 8px;

    .increment-button,
    .match-composer {
      border: 0px;
      padding: 0px;

      transition:
        width 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
        opacity 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
        padding 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
        box-shadow 300ms cubic-bezier(0.165, 0.84, 0.44, 1);

      &:hover {
        box-shadow:
          0 4px 4px rgba(72, 104, 178, 0.04),
          0 -3px 4px rgba(72, 104, 178, 0.04),
          0 6px 6px rgba(106, 111, 117, 0.1);
      }
    }

    .increment-button {
    }

    .match-composer {
    }

    &.is-increment {
      .increment-button {
        width: 100%;
        opacity: 1;
        box-shadow:
          0 -2px 2px rgba(72, 104, 178, 0.04),
          0 2px 2px rgba(106, 111, 117, 0.09),
          0 1px 2px rgba(72, 104, 178, 0.08);
      }

      .match-composer {
        width: 0%;
        opacity: 0;
      }
    }

    &:not(.is-increment) {
      .increment-button {
        width: 0%;
        opacity: 0;
      }

      .match-composer {
        width: 100%;
        opacity: 1;
        padding-inline: 8px;
        box-shadow:
          0 -2px 2px rgba(72, 104, 178, 0.04),
          0 2px 2px rgba(106, 111, 117, 0.09),
          0 1px 2px rgba(72, 104, 178, 0.08);
      }
    }
  }

  .operations-section {
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0%;
    min-width: 0px;
    display: flex;
    flex-direction: row;
  }

  .operation-toggle {
    width: 32px;
    height: 32px;
    border: 0px;
    padding: 0px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 -2px 2px rgba(72, 104, 178, 0.04),
      0 2px 2px rgba(106, 111, 117, 0.09),
      0 1px 2px rgba(72, 104, 178, 0.08);

    &.toggle-increment {
    }

    .increment-mark,
    .match-mark {
      font-size: 18px;
    }

    &.toggle-match {
    }
  }

  .collection-entries {
    width: 100%;
    min-height: 0px;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0%;
    padding-inline: 8px 6px;
    border-radius: 8px;
  }

  .collection-scroll {
    width: 100%;
    height: 100%;
    overflow: hidden scroll;
    scroll-snap-type: proximity;
    scroll-behavior: smooth;
    border-radius: 8px;
  }

  .collection-layout {
    display: flex;
    min-height: 0;
    flex-direction: column;
    padding-inline-end: 6px;
  }

  .single-entry {
    width: 100%;
    padding: 8px 12px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    word-break: keep-all;
    cursor: pointer;
    border-radius: 8px;
    transition:
      color 150ms cubic-bezier(0.165, 0.84, 0.44, 1),
      background-color 150ms cubic-bezier(0.165, 0.84, 0.44, 1);

    &:hover,
    &.is-active {
      color: #ffffff;
      background-color: rgba($color: #4080ff, $alpha: 1);
    }
  }
}
</style>
