<script setup lang="ts">
import demo from '@/assets/demo.mp4'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
// import coreJS from './ffmpeg-core.js?url'
// import coreWASM from './ffmpeg-core.wasm?url'
// import coreWorkerJS from './ffmpeg-core.worker.js?url'
// import coreJS from '@i-thinking/wasm/ffmpeg-core.js?url'
// import coreWASM from '@i-thinking/wasm/ffmpeg-core.wasm?url'
// import coreWorkerJS from '@i-thinking/wasm/ffmpeg-core.worker.js?worker'

defineOptions({
  name: 'clipchamp-view'
})

// https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm/ffmpeg-core.worker.js
const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
// const baseURL: string = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm'

const core = new FFmpeg()

async function handler() {
  const file = await fetchFile(demo)
  const writeResp = await core.writeFile('input.mp4', file)

  const listDir = await core.listDir('.')

  console.log('writeResp', writeResp, listDir)

  // await core.exec(['-i', 'input.mp4', 'output.mov'])
  await core.exec(['-i', 'input.mp4', '-t', '5', '-c:v', 'copy', '-c:a', 'copy', 'output.mp4'])
  // await core.exec([
  // 	'-i',
  // 	'input.mp4',
  // 	'-f',
  // 	'segment',
  // 	'-segment_time',
  // 	'3',
  // 	'-g',
  // 	'9',
  // 	'-sc_threshold',
  // 	'0',
  // 	'-force_key_frames',
  // 	'expr:gte(t,n_forced*9)',
  // 	'-reset_timestamps',
  // 	'1',
  // 	'-map',
  // 	'0',
  // 	'output_%d.mp4'
  // ])

  // const resp = await core.exec([
  // 	'-i',
  // 	'input.mp4',
  // 	'-c:v',
  // 	'libx264',
  // 	'-b:v',
  // 	'1M',
  // 	'-c:a',
  // 	'aac',
  // 	'-b:a',
  // 	'128k',
  // 	'-preset',
  // 	'fast',
  // 	'-y',
  // 	'output.mp4'
  // ])

  const output = await core.readFile('output.mp4')
  // 判断是不是很 Uint8Array类型
  const isBuffer = output instanceof Uint8Array
  if (!isBuffer) return
  const arrayBuffer = output.slice().buffer
  console.log('[output]', output)
  const blob = new Blob([arrayBuffer], { type: 'video/mp4' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'output.mp4'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

core.on('progress', function ({ progress, time }) {
  console.log('[progress]', `${progress * 100} % (transcoded time: ${time / 1000000} s)`)
})

core.on('log', function ({ message }) {
  console.log('[msg]', message)
})

onMounted(async function () {
  await core.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    // workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
  })
})
</script>

<template>
  <div class="clipchamp-view">
    <a-button @click="handler"> FFmpeg Clipchamp </a-button>
    <video :src="demo"></video>
  </div>
</template>

<style lang="scss" scoped></style>
