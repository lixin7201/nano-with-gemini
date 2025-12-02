import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac/permission';
import {
  deleteShowcase,
  getShowcaseById,
  updateShowcase,
} from '@/shared/models/showcase';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const showcase = await getShowcaseById(params.id);
  if (!showcase) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(showcase);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission({ code: PERMISSIONS.SHOWCASES_WRITE });
  } catch (error) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updated = await updateShowcase(params.id, body);
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission({ code: PERMISSIONS.SHOWCASES_DELETE });
  } catch (error) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteShowcase(params.id);
  return NextResponse.json({ success: true });
}
