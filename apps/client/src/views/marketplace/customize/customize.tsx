import { cyan, generate, green, presetPalettes, red } from '@ant-design/colors'
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons'
import { invoke } from '@tauri-apps/api/core'
import { downloadDir } from '@tauri-apps/api/path'
import { BaseDirectory, create } from '@tauri-apps/plugin-fs'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification
} from '@tauri-apps/plugin-notification'
import {
  Button,
  Card,
  Col,
  ColorPicker,
  type ColorPickerProps,
  Divider,
  Flex,
  Form,
  Input,
  Radio,
  Row,
  Segmented,
  theme,
  Upload
} from 'antd'
import type { Color } from 'antd/es/color-picker'
import type { SegmentedLabeledOption, SegmentedValue } from 'antd/es/segmented'
import type { RcFile, UploadFile } from 'antd/es/upload'
import { clsx } from 'clsx'

import { Glide } from '@/components/glide/glide'
import { useMirrorStore } from '@/stores/mirror.ts'
import { timeSphere } from '@i-thinking/utils'
import ReUtility from '@/features/utility/utility.tsx'

import styles from '@/features/applications/marketplace/overlay.module.scss'

type Presets = Required<ColorPickerProps>['presets'][number]

type SegmentedOption = SegmentedLabeledOption<SegmentedValue>

const validateMessages = {
  required: '${label}是必填的!',
  types: {
    title: '${label}不是有效标题!',
    url: '${label}不是有效链接!'
  }
}

function genPresets(presets = presetPalettes) {
  return Object.entries(presets).map<Presets>(([label, colors]) => ({
    label,
    colors,
    key: label
  }))
}

const customPanelRender: ColorPickerProps['panelRender'] = (
  _,
  { components: { Picker, Presets } }
) => (
  <Row
    justify="space-between"
    wrap={false}>
    <Col span={12}>
      <Presets />
    </Col>
    <Divider
      vertical
      style={{ height: 'auto' }}
    />
    <Col flex="auto">
      <Picker />
    </Col>
  </Row>
)

export default function Customize() {
  const { token } = theme.useToken()

  const mirror = useMirrorStore((state) => state.active.mirror)
  const [visible, onUpdateVisible] = useState(false)
  const [keyword, onUpdateKeyword] = useState('')
  const DEFAULT_COLORS = useMemo(
    function () {
      return genPresets({
        primary: generate(token.colorPrimary),
        red,
        green,
        cyan
      })
    },
    [token.colorPrimary]
  )

  const initialize = {
    title: '',
    url: '',
    color: 1,
    image: 1,
    layout: 'horizontal'
  }
  const [form] = Form.useForm()
  const [activeSegmented, updateActiveSegment] = useState<SegmentedValue>()
  const [files, updateFiles] = useState<UploadFile<any>[]>()

  const [colors, updateColors] = useState<string[]>([])

  const [segmentedOptions] = useState<SegmentedOption[]>([
    {
      value: '应用',
      label: '应用',
      icon: <AppstoreOutlined />
    },
    {
      value: '定制',
      label: '定制',
      icon: <BarsOutlined />
    }
  ])

  function onChangeComplete(value: Color) {
    const color = value.toHexString()
    updateColors(function (prev) {
      if (prev.includes(color)) return prev
      return [...prev, color]
    })
  }

  function handleEnsure() {}

  function handleFinish(value: any) {
    console.log('value', value)
  }

  const handleExport = useCallback(function () {
    invoke<Application[]>('application_reads').then(async function (applications) {
      let permissionGranted = await isPermissionGranted()
      if (!permissionGranted) {
        const permission = await requestPermission()
        permissionGranted = permission === 'granted'
      }
      try {
        const stringify = JSON.stringify(applications, null, 2)
        const now = timeSphere.now()
        const formatted = now.format('YYYY-MM-DD-HH-mm-ss')
        const filename = `applications-${formatted}.json`
        const download = await downloadDir()
        const encoder = new TextEncoder()
        const uint8 = encoder.encode(stringify)
        const file = await create(filename, {
          baseDir: BaseDirectory.Download
        })
        await file.write(uint8)
        await file.close()
        if (permissionGranted) {
          sendNotification({
            title: import.meta.env.VITE_APP_TITLE,
            body: '导出成功'
          })
        }
      } catch (error) {
        if (permissionGranted) {
          sendNotification({
            icon: 'icons/icon.ico',
            summary: (error as Error).message,
            title: import.meta.env.VITE_APP_TITLE,
            body: '导出失败'
          })
        }
      }
    })
  }, [])

  const handleImport = useCallback(function (file: RcFile, entries: RcFile[]) {
    updateFiles(entries)

    const reader = new FileReader()

    reader.addEventListener(
      'load',
      () => {
        const text = reader.result
        let parsed: Application[] = []
        try {
          parsed = JSON.parse(text as string)
          parsed.forEach(function (i) {
            i.mirrorID = mirror?.id ?? ''
            i.collectionID = ''
          })
          invoke('application_inserts', { applications: parsed })
        } catch (error) {
          console.error('Invalid JSON file', error)
          return
        }
        console.log('parsed', parsed)
      },
      {
        once: true
      }
    )

    reader.readAsText(file, 'utf-8')
    return false
  }, [])

  useEffect(
    function () {
      const collect = Object.values(DEFAULT_COLORS).reduce<string[]>(function (acc, cur) {
        const toStrings = cur.colors.map((color) => color.toString())
        return acc.concat(toStrings)
      }, [])

      requestAnimationFrame(function () {
        updateColors(collect)
      })
    },
    [DEFAULT_COLORS]
  )

  return (
    <div className={clsx(['size-full flex flex-col items-center justify-center gap-y-[6px]'])}>
      <ReUtility
        visible={visible}
        section={null}
        onUpdateVisible={onUpdateVisible}
        onUpdateKeyword={onUpdateKeyword}
      />

      <Form
        form={form}
        labelAlign="right"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 20 }}
        initialValues={initialize}
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: '16px'
        }}
        onFinish={handleFinish}
        validateMessages={validateMessages}>
        <Form.Item
          label="标题"
          name="title"
          className={clsx([styles.single, styles.title])}
          rules={[{ required: true }]}>
          <Input placeholder="请输入标题" />
        </Form.Item>
        <Form.Item
          name="url"
          label="链接"
          className={clsx([styles.single, styles.url])}
          rules={[{ required: true }]}>
          <Input placeholder="请输入链接" />
        </Form.Item>
        <Form.Item
          label="背景颜色"
          className={clsx([styles.single, styles.color])}
          rules={[{ required: true }]}>
          <Glide.X
            style={{
              width: '100%',
              height: '60px'
            }}>
            <Form.Item
              name="color"
              noStyle>
              <Radio.Group>
                {colors.map(function (color) {
                  return (
                    <Radio
                      key={color}
                      style={{
                        '--ant-color-bg-container': color
                      }}
                      value={color}></Radio>
                  )
                })}
              </Radio.Group>
            </Form.Item>
          </Glide.X>
          <ColorPicker
            onChangeComplete={onChangeComplete}
            className={clsx([styles.color, styles.picker])}
            defaultValue={token.colorPrimary}
            styles={{ popupOverlayInner: { width: 480 } }}
            presets={DEFAULT_COLORS}
            panelRender={customPanelRender}
          />
        </Form.Item>
        <Form.Item
          label="背景图片"
          className={clsx([styles.single, styles.image])}
          rules={[{ required: true }]}>
          <Glide.X
            style={{
              width: '100%',
              height: '60px'
            }}>
            <Form.Item
              name="image"
              noStyle>
              <Radio.Group
                options={[
                  { value: 1, label: 'A' },
                  { value: 2, label: 'B' },
                  { value: 3, label: 'D' },
                  { value: 4, label: 'E' },
                  { value: 5, label: 'F' },
                  { value: 6, label: 'G' },
                  { value: 7, label: 'H' },
                  { value: 8, label: 'I' },
                  { value: 9, label: 'J' }
                ]}></Radio.Group>
            </Form.Item>
          </Glide.X>
          <Flex>图片</Flex>
        </Form.Item>
        <Form.Item label={null}>
          <Button
            type="primary"
            htmlType="submit"
            onClick={handleEnsure}>
            添加
          </Button>
        </Form.Item>
      </Form>

      {/* <Upload
        showUploadList={true}
        fileList={files}
        name="applications"
        accept="application/json"
        beforeUpload={handleImport}>
        <Button> {files?.length ? '已' : '待'}导入</Button>
      </Upload>
      <Button onClick={handleExport}>导出</Button> */}
    </div>
  )
}
