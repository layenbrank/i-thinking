import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'

// 原生拖拽数据传输对象
export interface DragData extends Partial<Record<TransferFormat, string>> {}

type TransferFormat =
	| 'text/plain'
	| 'text/html'
	| 'text/css'
	| 'text/javascript'
	| 'text/json'
	| 'text/xml'
	| 'application/json'

const transferFormat: TransferFormat[] = [
	'text/plain',
	'text/html',
	'text/css',
	'text/javascript',
	'text/json',
	'text/xml',
	'application/json'
]
// text/html /<(\w+)[^>]*>(.*?<\/\1>)?/
class DraggableTransfer {
	private transfer: Map<TransferFormat, string> = new Map()
	public effectAllowed:
		| 'move'
		| 'copy'
		| 'link'
		| 'copyMove'
		| 'copyLink'
		| 'linkMove'
		| 'all'
		| 'none' = 'move'

	public dropEffect: 'move' | 'copy' | 'link' | 'none' = 'move'

	constructor() {
		// new Proxy(this.transfer,{})
	}

	set(format: TransferFormat, value: string) {
		if (!transferFormat.includes(format)) throw new Error(`Invalid transfer format: ${format}`)
		return this.transfer.set(format, value)
	}

	get(format: TransferFormat): string {
		if (!transferFormat.includes(format)) throw new Error(`Invalid transfer format: ${format}`)
		return this.transfer.get(format) || ''
	}

	clear(format?: TransferFormat) {
		if (!format) return this.transfer.clear()

		if (!transferFormat.includes(format)) throw new Error(`Invalid transfer format: ${format}`)
		this.transfer.delete(format)
	}

	has(format: TransferFormat): boolean {
		if (!transferFormat.includes(format)) throw new Error(`Invalid transfer format: ${format}`)
		return this.transfer.has(format)
	}

	size(): number {
		return this.transfer.size
	}

	get types(): readonly TransferFormat[] {
		return Array.from(this.transfer.keys())
	}
}

export const draggableTransfer = new DraggableTransfer()

// 简化的拖拽选项
export interface SimpleDragOptions {
	draggableSelector?: string
	dropZoneSelector?: string
	onPress?: (element: HTMLElement) => DragData | void
	onDragStart?: (element: HTMLElement) => void
	onDragEnd?: (element: HTMLElement) => void
}
