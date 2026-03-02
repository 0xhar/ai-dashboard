export { auth as middleware } from '@/lib/auth/config';

export const config = {
  matcher: [
    '/overview/:path*',
    '/teams/:path*',
    '/connections/:path*',
    '/alerts/:path*',
    '/settings/:path*',
    '/api/v1/:path*',
  ],
};
