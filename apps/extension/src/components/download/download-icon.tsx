import { NIcon } from 'naive-ui'
import type { PropType } from 'vue'
import { Download } from '@vicons/ionicons5'

interface AppIconProps {
  app: {
    name: string
    icon: string
  }
}

const appIconProps = {
  app: {
    type: Object as PropType<AppIconProps['app']>,
    required: true
  }
} as const

export default defineComponent({
  name: 'AppIcon',
  props: appIconProps,
  setup(props) {
    return () => {
      return (
        <div
          class={[
            'w-full h-full bg-gray-300 bg-opacity-30 flex items-center justify-center rounded-lg cursor-pointer'
          ]}
        >
          <NIcon color="#18A058" size={40}>
            <Download />
          </NIcon>
        </div>

        // <div class="app-icon">
        //   <img src={props.app.icon} alt={props.app.name} class="app-icon-img" />
        // </div>
      )
    }
  }
})
