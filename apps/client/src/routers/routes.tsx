import DesktopView from '@/views/desktop/DesktopView'
import Overview from '@/views/overview/overview.tsx'
import { Navigate, useRoutes } from 'react-router-dom'

export default function RouterView() {
	return useRoutes([
		{
			path: '/',
			element: <Navigate to={'/overview'} replace />
		},
		{
			path: '/overview',
			element: <Overview />
		},
		{
			path: '/home-view',
			element: <DesktopView />
		}
	])
}
