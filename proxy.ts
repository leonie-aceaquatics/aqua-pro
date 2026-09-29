import { NextRequest, NextResponse } from 'next/server'

// Next 16 renamed middleware.js to proxy.js. Same job: runs before the request completes.
//
// This is an optimistic check only — it asks "is there a session cookie at all" and sends people
// without one to the login page, so nobody lands on a dashboard shell that then fails to load.
// It deliberately does not verify the signature or look up the role: per the Next docs, proxy is
// not a session or authorisation layer. The real boundary is in the API routes, which check the
// signed cookie and scope every query to the organisations the user can see.

const SESSION_COOKIE = 'aquapro_session'
const PROTECTED = ['/admin', '/technician', '/pool-manager', '/client']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next()

  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    const login = new URL('/login', req.url)
    login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/technician/:path*', '/pool-manager/:path*', '/client/:path*'],
}
