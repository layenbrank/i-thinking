import { redirect, type LoaderFunctionArgs } from 'react-router-dom'

import { findAuthToken } from '@/utils/auth'

export function isAuth({ request }: LoaderFunctionArgs) {
  if (!findAuthToken()) {
    const url = new URL(request.url)
    return redirect(`/signin?redirect=${encodeURIComponent(url.pathname)}`)
  }
  return null
}
