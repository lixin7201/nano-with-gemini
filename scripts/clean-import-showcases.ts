import 'dotenv/config';
import { db } from '../src/core/db';
import { showcase } from '../src/config/db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  console.log('🧹 Cleaning imported showcases...\n');

  // 1. 先统计各类型数量
  const stats = await db()
    .select({
      source: showcase.source,
      count: sql<number>`count(*)`,
    })
    .from(showcase)
    .where(sql`${showcase.deletedAt} IS NULL`)
    .groupBy(showcase.source);

  console.log('📊 Current stats:');
  for (const row of stats) {
    console.log(`  ${row.source || 'null'}: ${row.count} items`);
  }

  // 2. 删除 source = 'import' 的数据（硬删除）
  await db()
    .delete(showcase)
    .where(eq(showcase.source, 'import'));

  console.log('\n✅ Deleted all import items');

  // 3. 再次统计
  const statsAfter = await db()
    .select({
      source: showcase.source,
      count: sql<number>`count(*)`,
    })
    .from(showcase)
    .where(sql`${showcase.deletedAt} IS NULL`)
    .groupBy(showcase.source);

  console.log('\n📊 Stats after cleanup:');
  for (const row of statsAfter) {
    console.log(`  ${row.source || 'null'}: ${row.count} items`);
  }

  console.log('\n🎉 Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
