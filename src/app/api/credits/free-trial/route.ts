import { eq, and } from 'drizzle-orm';

import { credit } from '@/config/db/schema';
import { db } from '@/core/db';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import {
  createCredit,
  CreditStatus,
  CreditTransactionType,
  NewCredit,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return new Response(
        JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'no auth, please sign in',
        }),
        { status: 401 }
      );
    }

    // Check if user has already used free trial
    const existingTrial = await db()
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.userId, user.id),
          eq(credit.transactionScene, 'free_trial')
        )
      )
      .limit(1);

    if (existingTrial.length > 0) {
      return new Response(
        JSON.stringify({
          code: 'FREE_TRIAL_USED',
          message: '你已经领取过免费试用',
        }),
        { status: 409 }
      );
    }

    // Grant 30 credits, valid for 30 days
    const now = new Date();
    const expiresAt = new Date(now.setDate(now.getDate() + 30));

    const newCredit: NewCredit = {
      id: getUuid(),
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.GRANT,
      transactionScene: 'free_trial',
      userId: user.id,
      status: CreditStatus.ACTIVE,
      description: 'Free Trial Credits',
      credits: 30,
      remainingCredits: 30,
      expiresAt: expiresAt,
    };

    await createCredit(newCredit);

    return respData({ success: true, message: '已发放 3 张 2K 试用额度' });
  } catch (e: any) {
    console.log('free trial claim failed:', e);
    return respErr('free trial claim failed: ' + e.message);
  }
}
