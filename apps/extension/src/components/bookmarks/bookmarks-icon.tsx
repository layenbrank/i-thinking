import { Folder } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
const AppIcon = defineComponent({
  setup() {},
  render() {
    return (
      <div
        class={[
          'w-full h-full bg-gray-300 bg-opacity-30 flex items-center justify-center rounded-lg cursor-pointer',
        ]}
      >
        <NIcon color="#ffd766" size={40}>
          <Folder />
        </NIcon>
      </div>
    )
  },
})

export default AppIcon
