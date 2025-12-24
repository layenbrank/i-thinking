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
import { clsx } from 'clsx'
import { cyan, generate, green, presetPalettes, red } from '@ant-design/colors'
import type { SegmentedLabeledOption, SegmentedOptions } from 'antd/es/segmented'
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons'

import Application from '@/components/application/application.tsx'

type Presets = Required<ColorPickerProps>['presets'][number]

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
	const [activeSegmented, updateActiveSegment] = useState<SegmentedOptions>()
	const [segmentedOptions] = useState<SegmentedOptions<SegmentedLabeledOption>>([
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
			onCancel={() => props.onUpdateVisible(false)}
			onOk={() => props.onUpdateVisible(false)}>
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
						layout="horizontal"
						labelCol={{ span: 4 }}
						wrapperCol={{ span: 20 }}
						labelAlign="right"
						form={form}
						onFinish={handleFinish}
						validateMessages={validateMessages}
						initialValues={{
							layout: 'horizontal'
						}}
						style={{
							maxWidth: 600
						}}>
						<Form.Item
							label="标题"
							name="title"
							rules={[{ required: true }]}>
							<Input placeholder="请输入标题" />
						</Form.Item>
						<Form.Item
							name="url"
							label="链接"
							rules={[{ required: true }]}>
							<Input placeholder="请输入链接" />
						</Form.Item>
						<Form.Item
							name="color"
							label="背景颜色"
							rules={[{ required: true }]}>
							<Radio.Group>
								<Radio value={1}>A</Radio>
								<Radio value={2}>B</Radio>
								<Radio value={3}>C</Radio>
							</Radio.Group>
							<ColorPicker
								defaultValue={token.colorPrimary}
								styles={{ popupOverlayInner: { width: 480 } }}
								presets={presets}
								panelRender={customPanelRender}
							/>
						</Form.Item>
						<Form.Item
							name="image"
							label="背景图片"
							rules={[{ required: true }]}>
							<Radio.Group
								options={[
									{ value: 1, label: 'A' },
									{ value: 2, label: 'B' },
									{ value: 3, label: 'C' }
								]}></Radio.Group>
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
