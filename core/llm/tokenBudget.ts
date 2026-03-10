import 'server-only';
import { config } from '@/core/config';
import type { Message } from '@/core/types';
import { estimateMessagesTokens } from './estimateToken';
import { prisma } from '@/lib/prisma';

/**
 * Token 预算超限错误
 */
export class TokenBudgetExceededError extends Error {
  constructor(
    public used: number,
    public limit: number
  ) {
    super(`Token budget exceeded: used ${used}, limit ${limit}`);
    this.name = 'TokenBudgetExceededError';
  }
}

export class TokenBudgetUserNotFoundError extends Error {
  constructor(public userId: string) {
    super(`User not found for token budget: ${userId}`);
    this.name = 'TokenBudgetUserNotFoundError';
  }
}

/**
 * 从 sessionId 解析 userId
 */
function parseUserId(sessionId: string): string {
  const parts = sessionId.split(':');
  return parts[0] || sessionId;
}

/**
 * 检查用户 token 是否超限
 */
export async function checkUserTokenBudget(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenUsed: true, tokenQuota: true },
  });

  if (!user) {
    throw new TokenBudgetUserNotFoundError(userId);
  }

  if (user.tokenUsed >= user.tokenQuota) {
    throw new TokenBudgetExceededError(user.tokenUsed, user.tokenQuota);
  }
}

/**
 * 检查单次请求 token 是否超限
 */
export function checkRequestBudget(messages: Message[]): void {
  const estimated = estimateMessagesTokens(messages);
  if (estimated > config.requestMaxTokens) {
    throw new TokenBudgetExceededError(estimated, config.requestMaxTokens);
  }
}

/**
 * 记录用户 token 使用量
 */
export async function recordUserTokenUsage(
  userId: string,
  used: number | null,
  messages: Message[]
): Promise<void> {
  const actualUsed = used ?? estimateMessagesTokens(messages);
  await reserveUserTokenUsage(userId, actualUsed);
}

export async function reserveUserTokenUsage(userId: string, tokensToUse: number): Promise<void> {
  if (!Number.isFinite(tokensToUse) || tokensToUse < 0) {
    throw new Error(`Invalid token usage: ${tokensToUse}`);
  }

  if (tokensToUse === 0) {
    await checkUserTokenBudget(userId);
    return;
  }

  const updated = await prisma.$queryRaw<Array<{ tokenUsed: number; tokenQuota: number }>>`
    UPDATE "User"
    SET "tokenUsed" = "tokenUsed" + ${tokensToUse}
    WHERE "id" = ${userId}
      AND "tokenUsed" + ${tokensToUse} <= "tokenQuota"
    RETURNING "tokenUsed", "tokenQuota"
  `;

  if (updated.length > 0) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenUsed: true, tokenQuota: true },
  });

  if (!user) {
    throw new TokenBudgetUserNotFoundError(userId);
  }

  throw new TokenBudgetExceededError(user.tokenUsed, user.tokenQuota);
}

export async function refundUserTokenUsage(userId: string, tokensToRefund: number): Promise<void> {
  if (!Number.isFinite(tokensToRefund) || tokensToRefund < 0) {
    throw new Error(`Invalid token refund: ${tokensToRefund}`);
  }

  if (tokensToRefund === 0) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      tokenUsed: {
        decrement: tokensToRefund,
      },
    },
  });
}

/**
 * 获取用户剩余 token 预算
 */
export async function getUserRemainingBudget(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenUsed: true, tokenQuota: true },
  });

  if (!user) {
    throw new TokenBudgetUserNotFoundError(userId);
  }

  return Math.max(0, user.tokenQuota - user.tokenUsed);
}

/**
 * 获取用户 token 使用统计
 */
export async function getUserTokenStats(userId: string): Promise<{
  used: number;
  quota: number;
  remaining: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenUsed: true, tokenQuota: true },
  });

  if (!user) {
    throw new TokenBudgetUserNotFoundError(userId);
  }

  return {
    used: user.tokenUsed,
    quota: user.tokenQuota,
    remaining: Math.max(0, user.tokenQuota - user.tokenUsed),
  };
}

// ============ 兼容旧 API（基于 sessionId） ============

/**
 * 检查会话 token 是否超限（兼容旧 API）
 */
export async function checkTokenBudget(sessionId: string): Promise<void> {
  const userId = parseUserId(sessionId);
  await checkUserTokenBudget(userId);
}

/**
 * 记录 token 使用量（兼容旧 API）
 */
export async function recordTokenUsage(
  sessionId: string,
  used: number | null,
  messages: Message[]
): Promise<void> {
  const userId = parseUserId(sessionId);
  await recordUserTokenUsage(userId, used, messages);
}

export async function refundTokenUsage(sessionId: string, used: number): Promise<void> {
  const userId = parseUserId(sessionId);
  await refundUserTokenUsage(userId, used);
}

/**
 * 获取剩余 token 预算（兼容旧 API）
 */
export async function getRemainingBudget(sessionId: string): Promise<number> {
  const userId = parseUserId(sessionId);
  return getUserRemainingBudget(userId);
}
