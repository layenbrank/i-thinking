import HomeView from '@/views/Home/HomeView.tsx'
import { Navigate, useRoutes } from 'react-router-dom'

export default function RouterView() {
	return useRoutes([
		{
			path: '/',
			element: <Navigate to={'/home-view'} replace />
		},
		{
			path: '/home-view',
			element: <HomeView />
		}
	])
}
