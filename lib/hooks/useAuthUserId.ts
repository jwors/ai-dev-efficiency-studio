import { useSession } from 'next-auth/react';

/**
 * 获取当前认证用户的 ID。
 * 封装 next-auth 的 useSession hook，提供类型安全的用户 ID 访问。
 * @returns 包含 userId、认证状态和 session 的对象
 */
export function useAuthUserId() {
  const { status, data: session } = useSession();
  const userId = status === 'authenticated' ? session?.user?.id ?? null : null;

  return { userId, status, session };
}
