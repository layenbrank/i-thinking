import DesktopView from '@/views/desktop/DesktopView'
import { Navigate, useRoutes } from 'react-router-dom'

export default function RouterView() {
	return useRoutes([
		{
			path: '/',
			element: <Navigate to={'/home-view'} replace />
		},
		{
			path: '/home-view',
			element: <DesktopView />
		}
	])
}
