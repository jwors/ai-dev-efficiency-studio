import { useSession } from 'next-auth/react';

export function useAuthUserId() {
  const { status, data: session } = useSession();
  const userId = status === 'authenticated' ? session?.user?.id ?? null : null;

  return { userId, status, session };
}
