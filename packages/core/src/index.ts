import "./styles/index.scss";

export * from "./types/widget.ts";
export * from "./types/theme.ts";

export * from "./store/widgets.ts";
export * from "./store/theme.ts";

export { default as WidgetContainer } from "./components/WidgetContainer.vue";
export { default as ClockWidget } from "./components/widgets/ClockWidget.vue";
export { default as DigitalClockWidget } from "./components/widgets/DigitalClockWidget.vue";
export { default as CalendarWidget } from "./components/widgets/CalendarWidget.vue";
export { default as WeatherWidget } from "./components/widgets/WeatherWidget.vue";
export { default as AppLauncherWidget } from "./components/widgets/AppLauncherWidget.vue";
export { default as SystemControlWidget } from "./components/widgets/SystemControlWidget.vue";
export { default as PowerWidget } from "./components/widgets/PowerWidget.vue";
export { default as MusicPlayerWidget } from "./components/widgets/MusicPlayerWidget.vue";
export { default as SettingsPanel } from "./components/SettingsPanel.vue";

export { default as ReSegment } from "./components/re-segment/index.vue";

export { useWheel } from "./hooks/useWheel.ts";

export { debounce } from "./directives/debounce.ts";
export { resize } from "./directives/resize.ts";

export { SingletonProxy, Singleton } from "./utils/singleton.ts";
export { example as singletonExample } from "./utils/example/singleton.example.ts";

export { dateTimeService } from "./utils/date-time-service.ts";
export { runExamples as dateTimeServiceExample } from "./utils/example/date-time-service-example.ts";

export { calendarService } from "./utils/calendar-service.ts";
export { runExamples as calendarServiceExample } from "./utils/example/calendar-service-example.ts";

export { createPersistedstate } from "./plugins/persist.ts";

export * from "./utils/http.ts";

export * from "./utils/progressive-renderer.tsx";
