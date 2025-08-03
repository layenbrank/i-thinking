interface RSF<T> {
	/**
	 * @description 响应数据
	 */
	data: T

	/**
	 * @description 响应状态码
	 */
	code: number

	/**
	 * @description 响应消息
	 */
	msg: string
}

interface RSP<T> extends RSF<T> {
	/**
	 * @description 总条数
	 */
	total: number
}
