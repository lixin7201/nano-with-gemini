import { envConfigs } from '@/config';

/**
 * 校验请求 Origin 是否合法
 */
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // 获取允许的域名
  const allowedOrigin = envConfigs.app_url;

  if (!allowedOrigin) {
    // 如果没有配置 app_url，跳过校验
    return true;
  }

  // 校验 Origin
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowedOrigin);
      return originUrl.host === allowedUrl.host;
    } catch {
      return false;
    }
  }

  // 如果没有 Origin，检查 Referer
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const allowedUrl = new URL(allowedOrigin);
      return refererUrl.host === allowedUrl.host;
    } catch {
      return false;
    }
  }

  // 没有 Origin 和 Referer 的请求（如服务端调用）允许通过
  return true;
}
