import { and, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, credit } from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai';
import { appendUserToResult, User } from '@/shared/models/user';

import { consumeCredits, CreditStatus, isAdminFreeCredits } from './credit';

export type AITask = typeof aiTask.$inferSelect & {
  user?: User;
};
export type NewAITask = typeof aiTask.$inferInsert;
export type UpdateAITask = Partial<Omit<NewAITask, 'id' | 'createdAt'>>;

export async function createAITask(newAITask: NewAITask) {
  // 简化版本：只创建任务记录，不消耗积分
  // 积分消耗已在 /api/ai/generate 中提前完成
  const [taskResult] = await db()
    .insert(aiTask)
    .values(newAITask)
    .returning();

  return taskResult;
}

export async function findAITaskById(id: string) {
  const [result] = await db().select().from(aiTask).where(eq(aiTask.id, id));
  return result;
}

export async function updateAITaskById(id: string, updateAITask: UpdateAITask) {
  const result = await db().transaction(async (tx) => {
    // task failed, Revoke credit consumption record
    if (updateAITask.status === AITaskStatus.FAILED && updateAITask.creditId) {
      // get consumed credit record
      const [consumedCredit] = await tx
        .select()
        .from(credit)
        .where(eq(credit.id, updateAITask.creditId));
      if (consumedCredit && consumedCredit.status === CreditStatus.ACTIVE) {
        const consumedItems = JSON.parse(consumedCredit.consumedDetail || '[]');

        // console.log('consumedItems', consumedItems);

        // add back consumed credits
        await Promise.all(
          consumedItems.map((item: any) => {
            if (item && item.creditId && item.creditsConsumed > 0) {
              return tx
                .update(credit)
                .set({
                  remainingCredits: sql`${credit.remainingCredits} + ${item.creditsConsumed}`,
                })
                .where(eq(credit.id, item.creditId));
            }
          })
        );

        // delete consumed credit record
        await tx
          .update(credit)
          .set({
            status: CreditStatus.DELETED,
          })
          .where(eq(credit.id, updateAITask.creditId));
      }
    }

    // update task
    const [result] = await db()
      .update(aiTask)
      .set(updateAITask)
      .where(eq(aiTask.id, id))
      .returning();

    return result;
  });

  return result;
}

export async function getAITasksCount({
  userId,
  status,
  mediaType,
  provider,
}: {
  userId?: string;
  status?: string;
  mediaType?: string;
  provider?: string;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(aiTask)
    .where(
      and(
        userId ? eq(aiTask.userId, userId) : undefined,
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        provider ? eq(aiTask.provider, provider) : undefined,
        status ? eq(aiTask.status, status) : undefined
      )
    );

  return result?.count || 0;
}

export async function getAITasks({
  userId,
  status,
  mediaType,
  provider,
  page = 1,
  limit = 30,
  getUser = false,
}: {
  userId?: string;
  status?: string;
  mediaType?: string;
  provider?: string;
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<AITask[]> {
  const result = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        userId ? eq(aiTask.userId, userId) : undefined,
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        provider ? eq(aiTask.provider, provider) : undefined,
        status ? eq(aiTask.status, status) : undefined
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}
