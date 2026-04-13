// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie =>
      redirectResponse.cookies.set(cookie.name, cookie.value)
    )
    return redirectResponse
  }

  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(cookie =>
        redirectResponse.cookies.set(cookie.name, cookie.value)
      )
      return redirectResponse
    }
  }

  console.log("USER:", user)
console.log("ADMIN:", user?.user_metadata?.is_admin)
if (user && pathname.startsWith('/auth/login')) {
  const isAdmin = user.user_metadata?.is_admin
  console.log("MW login redirect →", { userId: user.id, isAdmin })
  const url = request.nextUrl.clone()
  url.pathname = isAdmin ? '/admin' : '/dashboard'

  const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie =>
      redirectResponse.cookies.set(cookie.name, cookie.value)
    )
    return redirectResponse
}


  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

//middleware.ts
/*import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    /*'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
*/