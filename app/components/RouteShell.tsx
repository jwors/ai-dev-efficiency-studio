'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

type RouteShellProps = {
  children: React.ReactNode;
};

const AUTH_ROUTES = new Set(['/login', '/register']);

export default function RouteShell({ children }: RouteShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, data: session } = useSession();

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

  // 登录/注册页面在 loading 时直接显示，避免闪烁
  if (status === 'loading' && !AUTH_ROUTES.has(pathname)) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (pathname === '/login' || pathname === '/register') {
    return <div className="route route-single">{children}</div>;
  }

  const userName = session?.user?.name || session?.user?.email || '用户';

  return (
    <div className="layout">
      <aside className="nav">
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '0.5px solid #878787'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#000000',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg viewBox="0 0 64 64" aria-hidden="true" style={{ width: '22px', height: '22px' }}>
              <path
                d="M10 44c0-12 8-22 20-22 6 0 10 2 14 6l10-10c-8-8-16-12-24-12C12 6 0 20 0 38c0 11 4 20 12 26l8-8c-6-4-10-8-10-12z"
                fill="currentColor"
              />
              <path
                d="M54 30c0 12-8 22-20 22-6 0-10-2-14-6L10 56c8 8 16 12 24 12 18 0 30-14 30-32 0-11-4-20-12-26l-8 8c6 4 10 8 10 12z"
                fill="currentColor"
                opacity="0.7"
              />
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            fontSize: '18px',
            fontWeight: '600',
            color: '#000000'
          }}>
            JWORS
          </span>
        </div>

        <div className="nav-item" style={{ cursor: 'default', opacity: 0.7 }}>
          <span>{userName}</span>
        </div>

        <div style={{ height: '8px' }} />

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

        <div style={{ flex: 1 }} />

        <button
          className="nav-item"
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
              fill="currentColor"
            />
          </svg>
          <span>退出</span>
        </button>
      </aside>
      <div className="route">{children}</div>
    </div>
  );
}