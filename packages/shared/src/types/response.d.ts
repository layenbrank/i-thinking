interface RSF<T> {
	/**
	 * @description 响应状态码
	 */
	code: number
	/**
	 * @description 响应是否成功
	 */
	success: boolean
	/**
	 * @description 响应消息
	 */
	msg: string
	/**
	 * @description 响应数据
	 */
	data: T
	/**
	 * @description 响应时间戳
	 */
	timestamp: number
}

interface RSP<T> extends RSF<T> {
	/**
	 * @description 总条数
	 */
	total: number
}
