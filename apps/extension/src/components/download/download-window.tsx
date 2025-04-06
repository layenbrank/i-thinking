import style from './download.module.scss'

interface AppWindowProps {
  destroy: Function
}

const appWindowProps = {
  destroy: {
    type: Function,
    required: true
  }
} as const

export default defineComponent({
  name: 'AppWindow',
  props: appWindowProps,
  setup(props) {
    onMounted(async () => {
      const res = await chrome.downloads.download({
        url: 'https://www.baidu.com'
      })
      console.log('res', res)
    })

    onUnmounted(() => {})
  },
  render() {
    return <div class={['download-window']}>AppWindow</div>
  }
})
