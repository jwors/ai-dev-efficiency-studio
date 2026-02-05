'use client';
import { getCookie } from '@/utils';
import Link from 'next/link';
import { usePathname,useRouter } from 'next/navigation';

type RouteShellProps = {
  children: React.ReactNode;
};

import { ReactNode, useEffect, useState } from 'react';



export default function RouteShell({ children }: RouteShellProps) {
  const pathname = usePathname(); // Next.js 客户端路由路径
  const router = useRouter(); // Next.js 客户端路由实例
  const [isChecking, setIsChecking] = useState<boolean>(true); // 鉴权加载状态，防止页面闪屏
  const token = getCookie('token'); // 客户端读取 token Cookie

  useEffect(() => {

    const handleAuth = () => { 
      // 有登陆 但是来到登陆界面的 直接来到 /
      if (pathname === 'login') {
        if (token) {
          router.push('/')
          router.refresh()
        }
        setIsChecking(false)
        return
      }
      // 没有登陆的
      if (!token) {
        console.log(pathname)
        if (pathname === '/register') {
          router.push(pathname)
        } else {
          router.push(pathname)
        }
        router.refresh()
        setIsChecking(false)
        return
      }
    }
    handleAuth();

   }, [
    pathname,
    token,
    router
  ])

  // 校验中 就return
  if (isChecking) {
    return
  }

  // 登录页布局：无侧边导航，仅渲染子组件（与你原始逻辑一致）
  if (pathname === '/login' || pathname === '/register') {
    return <div className="route route-single">{children}</div>;
  }

  // 已登录非登录页布局：保留原有侧边导航+主内容区（与你原始样式/结构一致）
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