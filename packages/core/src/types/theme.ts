export type ThemeColor = 'purple' | 'red' | 'blue' | 'green' | 'pink' | 'teal' | 'yellow'

export interface Theme {
  id: ThemeColor
  name: string
  background: string
  glassBackground: string
  textColor: string
  secondaryTextColor: string
}

export const themes: Record<ThemeColor, Theme> = {
  purple: {
    id: 'purple',
    name: '紫色',
    background: 'linear-gradient(135deg, #9796f0 0%, #fbc7d4 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.7)'
  },
  red: {
    id: 'red',
    name: '红色',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ffc3a0 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.7)'
  },
  blue: {
    id: 'blue',
    name: '蓝色',
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.7)'
  },
  green: {
    id: 'green',
    name: '绿色',
    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.7)'
  },
  pink: {
    id: 'pink',
    name: '粉色',
    background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.7)'
  },
  teal: {
    id: 'teal',
    name: '青色',
    background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.7)'
  },
  yellow: {
    id: 'yellow',
    name: '黄色',
    background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff',
    secondaryTextColor: 'rgba(255, 255, 255, 0.7)'
  }
}
