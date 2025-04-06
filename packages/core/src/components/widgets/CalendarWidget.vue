<script setup lang="ts">
import { ref, computed } from "vue";

const currentDate = ref(new Date());
const selectedDate = ref<Date | null>(null);

const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

const currentMonthText = computed(() => {
  return currentDate.value.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });
});

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days = [];
  const today = new Date();

  // 添加上个月的日期
  const prevMonthDays = firstDay.getDay();
  const prevMonth = new Date(year, month, 0);
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonth.getDate() - i),
      dayNumber: prevMonth.getDate() - i,
      isOtherMonth: true,
      isToday: false,
    });
  }

  // 添加当前月的日期
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      dayNumber: i,
      isOtherMonth: false,
      isToday: isSameDay(date, today),
    });
  }

  // 添加下个月的日期
  const remainingDays = 42 - days.length; // 6 行 x 7 天
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      dayNumber: i,
      isOtherMonth: true,
      isToday: false,
    });
  }

  return days;
});

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isSelected(date: Date) {
  return selectedDate.value && isSameDay(date, selectedDate.value);
}

function selectDate(date: Date) {
  selectedDate.value = date;
}

function prevMonth() {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1,
  );
}

function nextMonth() {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1,
  );
}
</script>

<template>
  <div class="calendar-widget">
    <div class="calendar-header">
      <button class="nav-button" @click="prevMonth">&lt;</button>
      <div class="current-month">{{ currentMonthText }}</div>
      <button class="nav-button" @click="nextMonth">&gt;</button>
    </div>
    <div class="calendar-grid">
      <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
      <div
        v-for="date in calendarDays"
        :key="date.date.toString()"
        class="day"
        :class="{
          'other-month': date.isOtherMonth,
          today: date.isToday,
          selected: isSelected(date.date),
        }"
        @click="selectDate(date.date)"
      >
        {{ date.dayNumber }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.calendar-widget {
  padding: 1rem;
  user-select: none;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.current-month {
  font-size: 1.1rem;
  font-weight: 500;
}

.nav-button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.5rem;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.weekday {
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.7;
  padding: 0.5rem 0;
}

.day {
  text-align: center;
  padding: 0.5rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.other-month {
    opacity: 0.3;
  }

  &.today {
    background: rgba(255, 255, 255, 0.2);
    font-weight: bold;
  }

  &.selected {
    background: rgba(255, 255, 255, 0.3);
  }
}
</style>
