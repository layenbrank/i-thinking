import { Layout } from 'antd'
import type { ReactNode } from 'react'

interface LayoutProviderProps {
	children: ReactNode
}

export default function LayoutProvider(props: LayoutProviderProps) {
	return (
		<Layout>
			<Layout.Header>header</Layout.Header>
			<Layout.Content>{props.children}</Layout.Content>
			<Layout.Footer>footer</Layout.Footer>
		</Layout>
	)
}
