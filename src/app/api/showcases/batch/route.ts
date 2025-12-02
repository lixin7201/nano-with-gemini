import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac/permission';
import {
  batchToggleShowcasePin,
  deleteShowcases,
} from '@/shared/models/showcase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'IDs array is required' },
      { status: 400 }
    );
  }

  try {
    if (action === 'delete') {
      await requirePermission({ code: PERMISSIONS.SHOWCASES_DELETE });
      await deleteShowcases(ids);
    } else if (action === 'pin') {
      await requirePermission({ code: PERMISSIONS.SHOWCASES_WRITE });
      await batchToggleShowcasePin(ids, true);
    } else if (action === 'unpin') {
      await requirePermission({ code: PERMISSIONS.SHOWCASES_WRITE });
      await batchToggleShowcasePin(ids, false);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
