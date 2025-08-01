/**
 * @description GUID 格式生成
 * @returns {string}
 */
export function generateCvid(): string {
	// 生成标准GUID
	const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0
		const v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})

	// 转换为必应使用的格式（移除连字符并转为大写）
	return guid.replace(/-/g, '').toUpperCase()
}

/**
 * @description GUID 格式生成 加密随机数增强安全性
 * @returns {string}
 */
export function generateSecureCvid(): string {
	const array = new Uint8Array(16)
	window.crypto.getRandomValues(array)

	// 设置版本位（GUID v4标准）
	array[6] = (array[6] & 0x0f) | 0x40
	array[8] = (array[8] & 0x3f) | 0x80

	// 转换为十六进制字符串
	return Array.from(array)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase()
}

// export function generateThemeColors(theme: chrome.customizeChrome.SetTheme.ThemeResponse) {
//   return {
//     // 主要背景色
//     '--color-background-primary': parseColorToRGBA(theme.background_color),
//     '--color-background-secondary': parseColorToRGBA(theme.most_visited.background_color),

//     // 文本颜色
//     '--color-text-primary': parseColorToRGBA(theme.text_color),

//     // 快捷方式
//     '--color-shortcut-background': parseColorToRGBA(theme.add_shotcut_background_color),
//     '--color-shortcut-text': parseColorToRGBA(theme.add_shotcut_foreground_color),

//     // 按钮
//     '--color-button-default': parseColorToRGBA(theme.new_tab_page_button_background),
//     '--color-button-hover': parseColorToRGBA(theme.new_tab_page_button_background_hovered),

//     // 搜索框相关
//     '--color-search-background': parseColorToRGBA(theme.locationbar_normal_color),
//     '--color-search-hover': parseColorToRGBA(theme.omniboxresult_hover_color),
//     '--color-search-icon': parseColorToRGBA(theme.omniboxresult_icon_color),
//     '--color-search-url': parseColorToRGBA(theme.omniboxresult_url_color),
//     // '--color-search-bg': parseColorToRGBA(theme.omniboxresult_normal_color),
//     // 地址栏
//     '--color-address-default': parseColorToRGBA(theme.omniboxresult_normal_color),
//     '--color-address-hover': parseColorToRGBA(theme.locationbar_hover_color)
//   }
// }

// /**
//  * @description 颜色转换工具函数
//  * @param colorValue
//  * @returns
//  */
// export function parseColorToRGBA(colorValue: number): string {
//   const r = (colorValue >> 16) & 255
//   const g = (colorValue >> 8) & 255
//   const b = colorValue & 255
//   const a = (colorValue >> 24) & 255
//   return `rgba(${r}, ${g}, ${b}, ${a / 255})`
// }
