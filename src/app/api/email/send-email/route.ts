import { VerificationCode } from '@/shared/blocks/email/verification-code';
import { respData, respErr } from '@/shared/lib/resp';
import { getEmailService } from '@/shared/services/email';
import { getUserInfo } from '@/shared/models/user';
import { requirePermission, PERMISSIONS } from '@/core/rbac';

export async function POST(req: Request) {
  try {
    // 校验登录态
    const user = await getUserInfo();
    if (!user || !user.email) {
      return respErr('Please sign in first');
    }

    // 校验管理员权限
    await requirePermission({
      code: PERMISSIONS.ADMIN_ACCESS,
    });

    const { emails, subject } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return respErr('Invalid email recipients');
    }

    if (emails.length > 50) {
      return respErr('Too many recipients');
    }

    const emailService = await getEmailService();

    const result = await emailService.sendEmail({
      to: emails,
      subject: subject,
      react: VerificationCode({ code: '123455' }),
    });

    return respData(result);
  } catch (e: any) {
    console.error('send email failed:', e);
    return respErr('Failed to send email');
  }
}
