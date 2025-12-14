import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/intelligence/overlay.module.scss'
import {
	AlipayCircleOutlined,
	BulbOutlined,
	CheckCircleOutlined,
	CommentOutlined,
	CustomerServiceOutlined,
	FullscreenExitOutlined,
	FullscreenOutlined,
	GithubOutlined,
	LoadingOutlined,
	SmileOutlined,
	UserOutlined
} from '@ant-design/icons'
import {
	Bubble,
	Conversations,
	Prompts,
	Sender,
	Suggestion,
	ThoughtChain,
	XProvider,
	type ConversationItemType,
	type ThoughtChainItemType,
	type BubbleItemType,
	type PromptsItemType
} from '@ant-design/x'
import type { SuggestionItem } from '@ant-design/x/es/suggestion'
import { Card, Divider, Flex, FloatButton } from 'antd'
import clsx from 'clsx'
import React from 'react'

interface Props {
	visible: boolean
	onUpdateVisible: (value: boolean) => void
}

export default function Overlay(props: Props) {
	const overlayRef = React.useRef<HTMLDivElement>(null)
	const [fullscreen, updateFullscreen] = React.useState(false)
	const [sender, updateSender] = React.useState('')

	const bubbles: BubbleItemType[] = [
		{
			key: '1',
			role: 'user',
			placement: 'end',
			content: 'Hello Ant Design X!',
			avatar: <UserOutlined />
		},
		{
			key: '2',
			role: 'ai',
			content: 'Hello World!'
		},
		{
			key: '3',
			role: 'ai',
			content: '',
			loading: true
		}
	]

	const prompts: PromptsItemType[] = [
		{
			key: '1',
			label: 'Ignite Your Creativity',
			icon: (
				<BulbOutlined
					style={{
						color: '#FFD700'
					}}
				/>
			)
		},
		{
			key: '2',
			label: 'Tell me a Joke',
			icon: (
				<SmileOutlined
					style={{
						color: '#52C41A'
					}}
				/>
			)
		}
	]

	const suggestions: SuggestionItem[] = [
		{
			label: 'Write a report',
			value: 'report'
		}
	]

	const conversations: ConversationItemType[] = [
		{
			key: '1',
			label: 'Conversation - 1',
			icon: <GithubOutlined />
		},
		{
			key: '2',
			label: 'Conversation - 2',
			icon: <AlipayCircleOutlined />
		}
	]

	const thoughtChains: ThoughtChainItemType[] = [
		{
			title: 'Hello Ant Design X!',
			status: 'success',
			description: 'status: success',
			icon: <CheckCircleOutlined />,
			content: 'Ant Design X help you build AI chat/platform app as ready-to-use 📦.'
		},
		{
			title: 'Hello World!',
			status: 'success',
			description: 'status: success',
			icon: <CheckCircleOutlined />
		},
		{
			title: 'Pending...',
			status: 'loading',
			description: 'status: pending',
			icon: <LoadingOutlined />
		}
	]

	function handleSender(value: string, onTrigger: (value?: boolean) => void) {
		if (value === '/') onTrigger()
		else if (!value) onTrigger(false)
		updateSender(value)
	}

	return (
		<Application.Overlay
			open={props.visible}
			fullscreen={fullscreen}
			wrapClassName={styles.rootTop}
			className={clsx([styles.overlay])}
			onCancel={() => props.onUpdateVisible(false)}
			onOk={() => props.onUpdateVisible(false)}
		>
			<Flex gap={12} vertical ref={overlayRef} className={clsx(styles.provider, styles.flex)}>
				<Card className={clsx(styles.provider, styles.card)}>
					<XProvider direction="ltr">
						<Flex gap={12} className={clsx(styles.provider, styles.flex)}>
							<Conversations style={{ width: 200 }} defaultActiveKey="1" items={conversations} />
							<Divider orientation="vertical" className={styles.divider} />
							<Flex vertical justify="space-between" style={{ flex: 1 }}>
								<Bubble.List items={bubbles} />
								<Flex vertical gap={12}>
									<Prompts items={prompts} />
									<Suggestion items={suggestions}>
										{function ({ onTrigger, onKeyDown }) {
											return (
												<Sender
													value={sender}
													onKeyDown={onKeyDown}
													className={styles.sender}
													placeholder='Type "/" to trigger suggestion'
													onChange={(value) => handleSender(value, onTrigger)}
												/>
											)
										}}
									</Suggestion>
								</Flex>
							</Flex>
							<Divider orientation="vertical" className={styles.divider} />
							<ThoughtChain style={{ width: 200 }} items={thoughtChains} />
						</Flex>
						<FloatButton.Group
							trigger="hover"
							style={{ insetInlineEnd: 24 }}
							className={clsx(styles.float, styles.button)}
							icon={<CustomerServiceOutlined />}
						>
							<FloatButton
								onClick={() => updateFullscreen(!fullscreen)}
								icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
							/>
							<FloatButton icon={<CommentOutlined />} />
						</FloatButton.Group>
					</XProvider>
				</Card>
			</Flex>
		</Application.Overlay>
	)
}
