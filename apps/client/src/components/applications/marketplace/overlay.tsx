import { Button, Segmented, Card, Form, Input, Flex, type SegmentedProps } from 'antd'
import { clsx } from 'clsx'
import type { SegmentedOptions, SegmentedValue, SegmentedLabeledOption } from 'antd/es/segmented'
import { BarsOutlined, AppstoreOutlined } from '@ant-design/icons'

import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/marketplace/overlay.module.scss'

interface Props {
	visible: boolean
	onUpdateVisible: (value: boolean) => void
}

export default function Overlay(props: Props) {
	const formRef = useRef(null)
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

	const [configure, updateConfigure] = useState({
		title: '',
		url: ''
	})

	function handleEnsure() {}

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
					<Form ref={formRef}>
						<Input
							value={configure.title}
							onInput={(e) =>
								updateConfigure({
									title: e.currentTarget.value,
									url: configure.url
								})
							}></Input>
						<Input
							value={configure.url}
							onChange={(e) =>
								updateConfigure({
									title: configure.title,
									url: e.currentTarget.value
								})
							}></Input>
					</Form>
					<Button
						type="primary"
						onClick={handleEnsure}>
						确认
					</Button>
				</Card>
			</Flex>
		</Application.Overlay>
	)
}
