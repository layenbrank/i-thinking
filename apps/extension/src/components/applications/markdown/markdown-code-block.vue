<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/vue-3'
const props = withDefaults(defineProps<NodeViewProps>(), {})

defineOptions({
  name: 'markdown-code-block'
})

const languages = props.extension.options.lowlight.listLanguages()

const updateLanguage = computed({
  get() {
    return props.node.attrs.language
  },
  set(language) {
    props.updateAttributes({ language })
  }
})
</script>

<template>
  <node-view-wrapper class="markdown-code-block">
    <select
      contenteditable="false"
      v-model="updateLanguage">
      <option :value="null">auto</option>
      <option disabled>—</option>
      <option
        v-for="(language, index) in languages"
        :value="language"
        :key="index">
        {{ language }}
      </option>
    </select>
    <pre><code><node-view-content /></code></pre>
  </node-view-wrapper>
</template>

<style lang="scss" scoped>
.markdown-code-block {
  position: relative;

  select {
    position: absolute;
    background-color: var(--white);
    // background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="Black" d="M7 10l5 5 5-5z"/></svg>');
    // background-repeat: no-repeat;
    right: 0.5rem;
    top: 0.5rem;
  }
}
</style>
