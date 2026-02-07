'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

type RouteShellProps = {
  children: React.ReactNode;
};

const AUTH_ROUTES = new Set(['/login', '/register']);

export default function RouteShell({ children }: RouteShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (!pathname) return;
    if (status === 'loading') return;

    const isAuthed = status === 'authenticated';
    const isAuthRoute = AUTH_ROUTES.has(pathname);

    if (isAuthRoute && isAuthed) {
      router.replace('/');
      return;
    }

    if (!isAuthRoute && !isAuthed) {
      router.replace('/login');
    }
  }, [pathname, router, status]);

  if (status === 'loading') {
    return null;
  }

  if (pathname === '/login' || pathname === '/register') {
    return <div className="route route-single">{children}</div>;
  }

  return (
    <div className="layout">
      <aside className="nav">
        <div className="nav-title">Navigation</div>
        <Link className="nav-item" href="/">
          <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.2 3 10v10a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1V10l-9-6.8z"
              fill="currentColor"
            />
          </svg>
          <span>首页</span>
        </Link>
        <Link className="nav-item" href="/plugin">
          <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14 2H10l-.4 2.1-1.8.7-1.7-1.2-2.8 2.8 1.2 1.7-.7 1.8L2 10v4l2.1.4.7 1.8-1.2 1.7 2.8 2.8 1.7-1.2 1.8.7L10 22h4l.4-2.1 1.8-.7 1.7 1.2 2.8-2.8-1.2-1.7.7-1.8L22 14v-4l-2.1-.4-.7-1.8 1.2-1.7-2.8-2.8-1.7 1.2-1.8-.7L14 2zm-2 6a4 4 0 1 1-4 4 4 4 0 0 1 4-4z"
              fill="currentColor"
            />
          </svg>
          <span>插件</span>
        </Link>
      </aside>
      <div className="route">{children}</div>
    </div>
  );
}
