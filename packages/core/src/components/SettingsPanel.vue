<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '../store/theme'
import { useWidgetStore } from '../store/widgets'
import { themes } from '../types/theme'
import type { ThemeColor } from '../types/theme'

const themeStore = useThemeStore()
const widgetStore = useWidgetStore()

const currentTheme = computed(() => themeStore.currentTheme)

const setTheme = (theme: ThemeColor) => {
	themeStore.setTheme(theme)
}

const availableWidgets = [
	{
		type: 'app-launcher',
		name: '应用启动器',
		icon: '🚀',
		defaultConfig: {}
	},
	{
		type: 'system-control',
		name: '系统控制',
		icon: '⚡',
		defaultConfig: {}
	},
	{
		type: 'power',
		name: '电源选项',
		icon: '⭘',
		defaultConfig: {}
	},
	{
		type: 'clock',
		name: '模拟时钟',
		icon: '🕐',
		defaultConfig: {
			layout: 'standard',
			use24Hour: true
		}
	},
	{
		type: 'digital-clock',
		name: '数字时钟',
		icon: '🕙',
		defaultConfig: {
			size: 'large',
			showDate: true,
			use24Hour: true
		}
	},
	{
		type: 'calendar',
		name: '日历',
		icon: '📅',
		defaultConfig: {}
	},
	{
		type: 'weather',
		name: '天气',
		icon: '🌤️',
		defaultConfig: {}
	},
	{
		type: 'music-player',
		name: '音乐播放器',
		icon: '🎵',
		defaultConfig: {}
	}
]

const addWidget = (widget: (typeof availableWidgets)[0]) => {
	const id = `${widget.type}-${Date.now()}`
	widgetStore.addWidget({
		id,
		type: widget.type,
		position: {
			x: Math.random() * (window.innerWidth - 300),
			y: Math.random() * (window.innerHeight - 200)
		},
		size: {
			width: 300,
			height: 200
		},
		config: widget.defaultConfig
	})
}
</script>

<template>
	<div class="settings-panel">
		<div class="settings-section">
			<h3>主题设置</h3>
			<div class="theme-selector">
				<button
					v-for="theme in themes"
					:key="theme.id"
					class="theme-button"
					:class="{ active: currentTheme === theme.id }"
					:style="{ background: theme.background }"
					@click="setTheme(theme.id)"
				>
					<span class="theme-name">{{ theme.name }}</span>
				</button>
			</div>
		</div>

		<div class="settings-section">
			<h3>小部件</h3>
			<div class="widget-list">
				<div
					v-for="widget in availableWidgets"
					:key="widget.type"
					class="widget-item"
					@click="addWidget(widget)"
				>
					<span class="widget-icon">{{ widget.icon }}</span>
					<span class="widget-name">{{ widget.name }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.settings-panel {
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 2rem;
}

.settings-section {
	h3 {
		margin: 0 0 1rem;
		font-size: 1.2rem;
		font-weight: 500;
	}
}

.theme-selector {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
	gap: 0.5rem;
}

.theme-button {
	aspect-ratio: 1;
	border: none;
	border-radius: 12px;
	cursor: pointer;
	position: relative;
	overflow: hidden;
	transition: transform 0.2s ease;

	&:hover {
		transform: scale(1.05);
	}

	&.active {
		outline: 2px solid white;
		outline-offset: 2px;
	}

	.theme-name {
		position: absolute;
		bottom: 0.5rem;
		left: 0;
		right: 0;
		text-align: center;
		color: white;
		font-size: 0.8rem;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}
}

.widget-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 0.5rem;
}

.widget-item {
	padding: 1rem;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 12px;
	cursor: pointer;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	transition: background-color 0.2s ease;

	&:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.widget-icon {
		font-size: 2rem;
	}

	.widget-name {
		font-size: 0.9rem;
	}
}
</style>
