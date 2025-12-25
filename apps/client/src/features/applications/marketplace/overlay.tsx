import { cyan, generate, green, presetPalettes, red } from '@ant-design/colors'
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons'
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
  theme
} from 'antd'
import type { SegmentedLabeledOption, SegmentedValue } from 'antd/es/segmented'
import { clsx } from 'clsx'

import Application from '@/features/application/application.tsx'
import styles from '@/features/applications/marketplace/overlay.module.scss'

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
  const [segmentedOptions] = useState<SegmentedOption[]>([
    {
      value: '应用',
      icon: <AppstoreOutlined />
    },
    {
      value: '自定义',
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
      </Flex>
    </Application.Overlay>
  )
}
