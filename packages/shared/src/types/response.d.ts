interface RSF<F> {
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
	data: F
	/**
	 * @description 响应时间戳
	 */
	timestamp: number
}

interface RSP<P> extends RSF<P> {
	/**
	 * @description 总条数
	 */
	total: number
}
