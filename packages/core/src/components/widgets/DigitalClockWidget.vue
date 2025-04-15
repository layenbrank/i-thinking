<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";

const props = withDefaults(
  defineProps<{
    size?: "small" | "medium" | "large";
    showDate?: boolean;
    use24Hour?: boolean;
  }>(),
  {
    size: "medium",
    showDate: true,
    use24Hour: true,
  },
);

const now = ref(new Date());

const updateTime = () => {
  now.value = new Date();
};

let timer: number;

onMounted(() => {
  updateTime();
  timer = window.setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

const timeFormat = computed(() => {
  const hours = props.use24Hour
    ? now.value.getHours().toString().padStart(2, "0")
    : (now.value.getHours() % 12 || 12).toString().padStart(2, "0");
  const minutes = now.value.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
});

const monthFormat = computed(() => {
  return now.value.toLocaleDateString("zh-CN", { month: "long" });
});

const dayNumber = computed(() => {
  return now.value.getDate().toString().padStart(2, "0");
});
</script>

<template>
  <div class="digital-clock" :class="size">
    <div class="time">{{ timeFormat }}</div>
    <div v-if="showDate" class="date">
      <span class="month">{{ monthFormat }}</span>
      <span class="day">{{ dayNumber }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.digital-clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-family: "SF Pro Display", system-ui, sans-serif;
  letter-spacing: -0.02em;

  &.small {
    .time {
      font-size: 2rem;
    }
    .date {
      font-size: 0.875rem;
    }
  }

  &.medium {
    .time {
      font-size: 3rem;
    }
    .date {
      font-size: 1rem;
    }
  }

  &.large {
    .time {
      font-size: 4rem;
    }
    .date {
      font-size: 1.25rem;
    }
  }
}

.time {
  font-weight: 300;
  line-height: 1;
}

.date {
  margin-top: 0.5rem;
  opacity: 0.8;
  display: flex;
  gap: 0.5rem;
  align-items: center;

  .month {
    font-weight: 500;
  }

  .day {
    font-weight: 300;
  }
}
</style>
