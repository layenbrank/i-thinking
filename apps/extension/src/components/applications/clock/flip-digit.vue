<script setup lang="ts">
interface FlipDigitProps {
	total?: number
	current?: number
}

const props = withDefaults(defineProps<FlipDigitProps>(), {
	total: 9,
	current: -1
})

const previousDigit = ref(props.total === props.current ? -1 : props.total)
const isFlipping = ref(false)

watch(
	() => props.current,
	(_, oldValue) => {
		previousDigit.value = oldValue
		if (!isFlipping.value) {
			isFlipping.value = true
		}
	}
)
</script>

<template>
	<div :class="{ 'flip-animation': isFlipping }">
		<ul class="flip-digit">
			<li
				v-for="(_, digit) in total + 1"
				:key="digit"
				class="digit-item"
				:class="{
					'digit-active': current === digit,
					'digit-previous': digit === previousDigit
				}"
			>
				<div class="digit-top">
					<div class="digit-shadow"></div>
					<div class="digit-text">{{ digit }}</div>
				</div>
				<div class="digit-bottom">
					<div class="digit-shadow"></div>
					<div class="digit-text">{{ digit }}</div>
				</div>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" scoped>
$digit-width: 60px;
$digit-height: 90px;
$font-size: 80px;
$divider-width: 3px;
$border-radius: 6px;

.flip-digit {
	position: relative;
	margin: 5px;
	width: $digit-width;
	height: $digit-height;
	font-size: $font-size;
	font-weight: bold;
	line-height: $digit-height - $divider-width;
	border-radius: $border-radius;
	box-shadow: 0 1px 10px rgba(0, 0, 0, 0.7);

	.digit-item {
		list-style: none;
		z-index: 1;
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		perspective: 200px;
		transition: opacity 0.3s;

		&.digit-active {
			z-index: 2;
		}

		&:first-child {
			z-index: 2;
		}

		.digit-top,
		.digit-bottom {
			z-index: 1;
			position: absolute;
			left: 0;
			width: 100%;
			height: 50%;
			overflow: hidden;
		}

		.digit-top {
			transform-origin: 50% 100%;
			top: 0;

			&:after {
				content: '';
				position: absolute;
				top: calc(($digit-height - $divider-width) / 2);
				left: 0;
				z-index: 5;
				width: 100%;
				height: $divider-width;
				background-color: rgba(0, 0, 0, 0.4);
			}
		}

		.digit-bottom {
			transform-origin: 50% 0%;
			bottom: 0;
			transition: opacity 0.3s;
		}

		.digit-text {
			position: absolute;
			left: 0;
			z-index: 1;
			width: 100%;
			height: 200%;
			color: #ccc;
			text-shadow: 0 1px 2px #000;
			text-align: center;
			background-color: #333;
			border-radius: $border-radius;
		}

		.digit-top .digit-text {
			top: 0;
		}

		.digit-bottom .digit-text {
			bottom: 0;
		}
	}
}

// 保持原有动画效果
.flip-animation {
	.digit-item {
		&.digit-previous {
			z-index: 3;
		}
		&.digit-active {
			animation: asd 0.5s 0.5s linear both;
			z-index: 2;
		}
		&.digit-previous .digit-top {
			z-index: 2;
			animation: turn-up 0.5s linear both;
		}
		&.digit-active .digit-bottom {
			z-index: 2;
			animation: turn-down 0.5s 0.5s linear both;
		}
	}

	.digit-shadow {
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: 2;
	}

	.digit-previous .digit-top .digit-shadow {
		background: linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 1) 100%);
		animation: show 0.5s linear both;
	}

	.digit-active .digit-top .digit-shadow {
		background: linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 1) 100%);
		animation: hide 0.5s 0.3s linear both;
	}

	.digit-previous .digit-bottom .digit-shadow {
		background: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.1) 100%);
		animation: show 0.5s linear both;
	}

	.digit-active .digit-bottom .digit-shadow {
		background: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.1) 100%);
		animation: hide 0.5s 0.3s linear both;
	}
}

// 保持原有关键帧动画
@keyframes turn-down {
	0% {
		transform: rotateX(90deg);
	}
	100% {
		transform: rotateX(0deg);
	}
}

@keyframes turn-up {
	0% {
		transform: rotateX(0deg);
	}
	100% {
		transform: rotateX(-90deg);
	}
}

@keyframes asd {
	0% {
		z-index: 2;
	}
	5% {
		z-index: 4;
	}
	100% {
		z-index: 4;
	}
}

@keyframes show {
	0% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}

@keyframes hide {
	0% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}
</style>
