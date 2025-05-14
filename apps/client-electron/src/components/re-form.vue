<script setup lang="ts">
import type { JSX } from 'vue/jsx-runtime'
import { type FormProps, type FormItemProps } from 'ant-design-vue'
import { clsx, type ClassValue } from 'clsx'

export interface FormOptions extends FormItemProps {
  label: string
  key: string
  value: string
  class?: ClassValue
  content: () => JSX.Element
}

export interface ReFormProps extends FormProps {
  options: FormOptions[]
}

defineOptions({
  name: 're-form'
})

const props = withDefaults(defineProps<ReFormProps>(), {})

const formProps = computed(() => {
  const { options, ...remains } = props
  return { ...remains }
})
</script>

<template>
  <a-form v-bind="formProps">
    <a-form-item
      v-for="state in options"
      v-bind="state"
      :key="state.key"
      :class="[state.key, clsx(state.class ?? '')]"
    >
      <component :is="state.content()" />
    </a-form-item>
  </a-form>
</template>

<style lang="scss" scoped></style>
