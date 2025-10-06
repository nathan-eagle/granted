import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/overview'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
