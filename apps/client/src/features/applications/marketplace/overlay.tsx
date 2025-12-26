import { cyan, generate, green, presetPalettes, red } from '@ant-design/colors'
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons'
import { downloadDir } from '@tauri-apps/api/path'
import { writeFile, BaseDirectory, exists, create } from '@tauri-apps/plugin-fs'
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
import type { SegmentedLabeledOption, SegmentedValue } from 'antd/es/segmented'
import type { RcFile, UploadFile } from 'antd/es/upload'
import { clsx } from 'clsx'

import { database } from '@/databases/database.ts'
import Application from '@/features/application/application.tsx'
import styles from '@/features/applications/marketplace/overlay.module.scss'
import { mirror$ } from '@/stores/mirror.ts'
import { timeSphere } from '@i-thinking/core'

type Presets = Required<ColorPickerProps>['presets'][number]

type SegmentedOption = SegmentedLabeledOption<SegmentedValue>

interface Props {
  visible: boolean
  onUpdateVisible: (value: boolean) => void
}

const validateMessages = {
  required: '${label}是必填的!',
  types: {
    title: '${label}不是有效标题!',
    url: '${label}不是有效链接!'
  }
}

function genPresets(presets = presetPalettes) {
  return Object.entries(presets).map<Presets>(([label, colors]) => ({ label, colors, key: label }))
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

export default function Overlay(props: Props) {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [activeSegmented, updateActiveSegment] = useState<SegmentedValue>()
  const [files, updateFiles] = useState<UploadFile<any>[]>()
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

  const presets = genPresets({
    primary: generate(token.colorPrimary),
    red,
    green,
    cyan
  })

  function handleEnsure() {}

  function handleFinish(value: any) {
    console.log('value', value)
  }

  const handleExport = useCallback(function () {
    database.application
      .orderBy('index')
      .toArray()
      .then(async function (applications) {
        const stringify = JSON.stringify(applications, null, 2) // Convert applications to JSON string
        const now = timeSphere.now()
        const formatted = now.format('YYYY-MM-DD-HH-mm-ss')
        const filename = `applications-${formatted}.json`
        const download = await downloadDir()
        console.log('download', download)
        console.log('BaseDirectory', BaseDirectory, '\nDownload', BaseDirectory.Download)
        // stringify 转为 Uint8Array 并写入文件
        const encoder = new TextEncoder()
        const uint8 = encoder.encode(stringify)
        console.log('filename', filename, '\nfilepath', `${download}/${filename}`)
        const file = await create(filename, {
          baseDir: BaseDirectory.Download
        })
        await file.write(uint8)
        await file.close()
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
          database.application.bulkAdd(parsed)
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

  return (
    <Application.Overlay
      open={props.visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => props.onUpdateVisible(false)}
      onCancel={() => props.onUpdateVisible(false)}>
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
            layout="horizontal"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            initialValues={{
              layout: 'horizontal'
            }}
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
              <Form.Item name="color">
                <Radio.Group
                  options={[
                    { value: 1, label: 'A' },
                    { value: 2, label: 'B' },
                    { value: 3, label: 'C' }
                  ]}></Radio.Group>
              </Form.Item>
              <ColorPicker
                className={clsx([styles.color, styles.picker])}
                defaultValue={token.colorPrimary}
                styles={{ popupOverlayInner: { width: 480 } }}
                presets={presets}
                panelRender={customPanelRender}
              />
            </Form.Item>
            <Form.Item
              label="背景图片"
              className={clsx([styles.single, styles.image])}
              rules={[{ required: true }]}>
              <Form.Item name="image">
                <Radio.Group
                  options={[
                    { value: 1, label: 'A' },
                    { value: 2, label: 'B' },
                    { value: 3, label: 'C' }
                  ]}></Radio.Group>
              </Form.Item>
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
