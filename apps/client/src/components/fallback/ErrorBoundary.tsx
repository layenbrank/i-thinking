export class ErrorBoundary extends React.Component<
	{
		children: React.ReactNode
	},
	{ hasError: boolean }
> {
	constructor(props: any) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	render() {
		if (this.state.hasError) return <div>Component failed</div>

		return this.props.children
	}
}
