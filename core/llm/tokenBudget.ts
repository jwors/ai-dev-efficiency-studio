import 'server-only';
import { config } from '@/core/config';
import type { Message } from '@/core/types';
import { estimateMessagesTokens } from './estimateToken';
import { prisma } from '@/lib/prisma';

/**
 * Token 预算超限错误
 */
export class TokenBudgetExceededError extends Error {
  /**
   * 创建 Token 预算超限错误实例。
   * @param used - 已使用的 token 数量
   * @param limit - token 配额上限
   */
  constructor(
    public used: number,
    public limit: number
  ) {
    super(`Token budget exceeded: used ${used}, limit ${limit}`);
    this.name = 'TokenBudgetExceededError';
  }
}

/**
 * 用户未找到错误（用于 token 预算查询）
 */
export class TokenBudgetUserNotFoundError extends Error {
  /**
   * 创建用户未找到错误实例。
   * @param userId - 用户 ID
   */
  constructor(public userId: string) {
    super(`User not found for token budget: ${userId}`);
    this.name = 'TokenBudgetUserNotFoundError';
  }
}

/**
 * 从 sessionId 解析 userId。
 * sessionId 格式为 "userId:timestamp" 或直接是 userId。
 * @param sessionId - 会话 ID
 * @returns 用户 ID
 */
function parseUserId(sessionId: string): string {
  const parts = sessionId.split(':');
  return parts[0] || sessionId;
}

/**
 * 检查用户 token 是否超限。
 * @param userId - 用户 ID
 * @throws TokenBudgetUserNotFoundError 如果用户不存在
 * @throws TokenBudgetExceededError 如果 token 预算已超限
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
 * 检查单次请求 token 是否超限。
 * @param messages - 请求消息数组
 * @throws TokenBudgetExceededError 如果估算 token 超过单次请求上限
 */
export function checkRequestBudget(messages: Message[]): void {
  const estimated = estimateMessagesTokens(messages);
  if (estimated > config.requestMaxTokens) {
    throw new TokenBudgetExceededError(estimated, config.requestMaxTokens);
  }
}

/**
 * 记录用户 token 使用量。
 * @param userId - 用户 ID
 * @param used - 已使用的 token 数量（可选，不传则自动估算）
 * @param messages - 消息数组（用于估算 token）
 */
export async function recordUserTokenUsage(
  userId: string,
  used: number | null,
  messages: Message[]
): Promise<void> {
  const actualUsed = used ?? estimateMessagesTokens(messages);
  await reserveUserTokenUsage(userId, actualUsed);
}

/**
 * 预留用户 token 使用量（原子操作）。
 * 使用数据库原子操作确保并发安全。
 * @param userId - 用户 ID
 * @param tokensToUse - 要使用的 token 数量
 * @throws TokenBudgetUserNotFoundError 如果用户不存在
 * @throws TokenBudgetExceededError 如果 token 预算不足
 */
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

/**
 * 退还用户 token 使用量。
 * @param userId - 用户 ID
 * @param tokensToRefund - 要退还的 token 数量
 */
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
 * 获取用户剩余 token 预算。
 * @param userId - 用户 ID
 * @returns 剩余 token 数量
 * @throws TokenBudgetUserNotFoundError 如果用户不存在
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
 * 获取用户 token 使用统计。
 * @param userId - 用户 ID
 * @returns 包含已使用、配额和剩余 token 的统计对象
 * @throws TokenBudgetUserNotFoundError 如果用户不存在
 */
async function getUserTokenStats(userId: string): Promise<{
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
 * 检查会话 token 是否超限（兼容旧 API）。
 * @param sessionId - 会话 ID
 * @throws TokenBudgetUserNotFoundError 如果用户不存在
 * @throws TokenBudgetExceededError 如果 token 预算已超限
 */
export async function checkTokenBudget(sessionId: string): Promise<void> {
  const userId = parseUserId(sessionId);
  await checkUserTokenBudget(userId);
}

/**
 * 记录 token 使用量（兼容旧 API）。
 * @param sessionId - 会话 ID
 * @param used - 已使用的 token 数量（可选）
 * @param messages - 消息数组
 */
export async function recordTokenUsage(
  sessionId: string,
  used: number | null,
  messages: Message[]
): Promise<void> {
  const userId = parseUserId(sessionId);
  await recordUserTokenUsage(userId, used, messages);
}

/**
 * 退还 token 使用量（兼容旧 API）。
 * @param sessionId - 会话 ID
 * @param used - 要退还的 token 数量
 */
export async function refundTokenUsage(sessionId: string, used: number): Promise<void> {
  const userId = parseUserId(sessionId);
  await refundUserTokenUsage(userId, used);
}

/**
 * 获取剩余 token 预算（兼容旧 API）。
 * @param sessionId - 会话 ID
 * @returns 剩余 token 数量
 */
export async function getRemainingBudget(sessionId: string): Promise<number> {
  const userId = parseUserId(sessionId);
  return getUserRemainingBudget(userId);
}
