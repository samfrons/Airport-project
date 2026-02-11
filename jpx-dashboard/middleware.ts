import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    typeof url === 'string' &&
    url.length > 0 &&
    !url.includes('your-project') &&
    typeof key === 'string' &&
    key.length > 0 &&
    !key.includes('your-anon-key')
  );
}

export async function middleware(request: NextRequest) {
  // If Supabase is not configured, skip auth (demo mode)
  if (!isSupabaseConfigured()) {
    // Redirect /login back to / since auth is disabled
    if (request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
