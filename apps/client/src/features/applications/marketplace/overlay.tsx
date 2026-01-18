import { cyan, generate, green, presetPalettes, red } from '@ant-design/colors'
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons'
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

import { Scroll } from '@/components/scroll/scroll.tsx'
import { database } from '@/databases/database.ts'
import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/marketplace/overlay.module.scss'
import { mirror$ } from '@/stores/mirror.ts'
import { timeSphere } from '@i-thinking/utils'

type Presets = Required<ColorPickerProps>['presets'][number]

type SegmentedOption = SegmentedLabeledOption<SegmentedValue>

// interface OverlayProps {}

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

export default function Overlay(props: OverlayControlProps) {
  const { token } = theme.useToken()

  const { visible, onUpdateVisible } = useContext(OverlayContext)
  // const { visible, updateVisible, mounted } = useContext(OverlayContext)
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
    void database.application
      .orderBy('index')
      .toArray()
      .then(async function (applications) {
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
          console.log('download', download)
          console.log(
            'BaseDirectory',
            BaseDirectory,
            '\nDownload',
            BaseDirectory.Download
          )
          // stringify 转为 Uint8Array 并写入文件
          const encoder = new TextEncoder()
          const uint8 = encoder.encode(stringify)
          console.log(
            'filename',
            filename,
            '\nfilepath',
            `${download}/${filename}`
          )
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
            i.mirrorID = mirror$.value?.id ?? ''
            i.collectionID = ''
          })
          void database.application.bulkAdd(parsed)
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

    console.log('entries', entries)
    // for (const entry of entries) {
    //   database.application.bulkPut(items, keys, options)
    // }
    return false
  }, [])

  useEffect(
    function () {
      const collect = Object.values(DEFAULT_COLORS).reduce<string[]>(function (
        acc,
        cur
      ) {
        const toStrings = cur.colors.map((color) => color.toString())
        return acc.concat(toStrings)
      }, [])

      requestAnimationFrame(function () {
        updateColors(collect)
      })

      console.log('collect', collect)
    },
    [DEFAULT_COLORS]
  )

  return (
    <Application.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <Flex
        justify="center"
        className={clsx(['h-full'])}>
        <Segmented
          size="large"
          value={activeSegmented}
          onChange={updateActiveSegment}
          orientation="vertical"
          options={segmentedOptions}
        />
        <Card className={clsx(['flex-1 h-full'])}>
          <Form
            form={form}
            labelAlign="right"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            initialValues={initialize}
            style={{
              maxWidth: 600
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
              <Scroll.X
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
              </Scroll.X>
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
              <Scroll.X
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
              </Scroll.X>

              <Flex>图片</Flex>
            </Form.Item>
            <Form.Item label={null}>
              <Button
                type="primary"
                htmlType="submit"
                onClick={handleEnsure}>
                确认
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Upload
          showUploadList={true}
          fileList={files}
          name="applications"
          accept="application/json"
          beforeUpload={handleImport}>
          <Button> {files?.length ? '已' : '待'}导入</Button>
        </Upload>
        <Button onClick={handleExport}>导出</Button>
      </Flex>
    </Application.Overlay>
  )
}
