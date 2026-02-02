'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

type RouteShellProps = {
  children: React.ReactNode;
};

export default function RouteShell({ children }: RouteShellProps) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
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
