import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { showcase } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type Showcase = typeof showcase.$inferSelect;
export type NewShowcase = typeof showcase.$inferInsert;

/**
 * Add a new showcase
 */
export async function addShowcase(data: Omit<NewShowcase, 'id'> & { id?: string }): Promise<Showcase> {
  const [newShowcase] = await db()
    .insert(showcase)
    .values({
      ...data,
      id: data.id || getUuid(),
    })
    .returning();
  return newShowcase;
}

/**
 * Update a showcase
 */
export async function updateShowcase(
  id: string,
  data: Partial<Showcase>
): Promise<Showcase> {
  const [updated] = await db()
    .update(showcase)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(showcase.id, id))
    .returning();
  return updated;
}

/**
 * Soft delete a showcase
 */
export async function deleteShowcase(id: string): Promise<void> {
  await db()
    .update(showcase)
    .set({
      status: 'deleted',
      deletedAt: new Date(),
    })
    .where(eq(showcase.id, id));
}

/**
 * Batch soft delete showcases
 */
export async function deleteShowcases(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db()
    .update(showcase)
    .set({
      status: 'deleted',
      deletedAt: new Date(),
    })
    .where(inArray(showcase.id, ids));
}

/**
 * Get showcases (Public)
 * Filter by status=published and not deleted
 */
export async function getShowcases({
  keyword,
  page = 1,
  limit = 20,
}: {
  keyword?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Showcase[]; total: number }> {
  const offset = (page - 1) * limit;

  const conditions = [
    eq(showcase.status, 'published'),
    sql`${showcase.deletedAt} IS NULL`,
  ];

  if (keyword) {
    const search = `%${keyword}%`;
    const searchCondition = or(like(showcase.title, search), like(showcase.prompt, search));
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const where = and(...conditions);

  const [countResult] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(showcase)
    .where(where);

  const items = await db()
    .select()
    .from(showcase)
    .where(where)
    .orderBy(desc(showcase.isPinned), desc(showcase.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items,
    total: Number(countResult?.count || 0),
  };
}

/**
 * Get showcases (Admin)
 * Can see all statuses
 */
export async function getShowcasesAdmin({
  keyword,
  page = 1,
  limit = 20,
  sortBy = 'newest',
}: {
  keyword?: string;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest';
}): Promise<{ items: Showcase[]; total: number }> {
  const offset = (page - 1) * limit;

  const conditions = [sql`${showcase.deletedAt} IS NULL`];

  if (keyword) {
    const search = `%${keyword}%`;
    const searchCondition = or(like(showcase.title, search), like(showcase.prompt, search));
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const where = and(...conditions);

  const [countResult] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(showcase)
    .where(where);

  const items = await db()
    .select()
    .from(showcase)
    .where(where)
    .orderBy(
      sortBy === 'newest' ? desc(showcase.createdAt) : sql`${showcase.createdAt} ASC`
    )
    .limit(limit)
    .offset(offset);

  return {
    items,
    total: Number(countResult?.count || 0),
  };
}

/**
 * Get showcase by ID
 */
export async function getShowcaseById(id: string): Promise<Showcase | null> {
  const [item] = await db()
    .select()
    .from(showcase)
    .where(eq(showcase.id, id));
  return item || null;
}

/**
 * Toggle showcase pin status
 */
export async function toggleShowcasePin(
  id: string,
  isPinned: boolean
): Promise<void> {
  await db()
    .update(showcase)
    .set({ isPinned })
    .where(eq(showcase.id, id));
}

/**
 * Batch toggle showcase pin status
 */
export async function batchToggleShowcasePin(
  ids: string[],
  isPinned: boolean
): Promise<void> {
  if (ids.length === 0) return;
  await db()
    .update(showcase)
    .set({ isPinned })
    .where(inArray(showcase.id, ids));
}
