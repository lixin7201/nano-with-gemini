import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac/permission';
import { getSignUser } from '@/shared/models/user';
import { addShowcase, getShowcases } from '@/shared/models/showcase';
import { getNanoBananaShowcaseItems } from '@/shared/adapters/nano-banana-prompts';

/**
 * Import static JSON showcase data to database
 * POST /api/showcases/import
 */
export async function POST(req: NextRequest) {
  try {
    await requirePermission({ code: PERMISSIONS.SHOWCASES_WRITE });
  } catch (error) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await getSignUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all static items from JSON
    const staticItems = getNanoBananaShowcaseItems(undefined, 'zh');

    // Get existing showcases to avoid duplicates
    const { items: existingItems } = await getShowcases({ limit: 10000 });
    const existingPrompts = new Set(existingItems.map(item => item.prompt || ''));

    // Filter out items that already exist (by prompt)
    const newItems = staticItems.filter(item => item.prompt && !existingPrompts.has(item.prompt));

    if (newItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All items already imported',
        imported: 0,
        skipped: staticItems.length,
      });
    }

    // Import new items
    let imported = 0;
    const errors: string[] = [];

    for (const item of newItems) {
      try {
        await addShowcase({
          userId: user.id,
          title: item.title,
          prompt: item.prompt || '',
          image: item.image?.src || '',
          tags: '',
          source: 'import',
          status: 'published',
        });
        imported++;
      } catch (err) {
        errors.push(`Failed to import: ${item.title}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${imported} items`,
      imported,
      skipped: staticItems.length - newItems.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import showcases' },
      { status: 500 }
    );
  }
}
