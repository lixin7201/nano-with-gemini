import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oneTap } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { getUuid, getSnowId } from '@/shared/lib/hash';
import { getAllConfigs } from '@/shared/models/config';
import {
  createCredit,
  CreditStatus,
  CreditTransactionType,
  NewCredit,
} from '@/shared/models/credit';

// Static auth options - NO database connection
// This ensures zero database calls during build time
export const authOptions = {
  appName: envConfigs.app_name,
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  trustedOrigins: envConfigs.app_url ? [envConfigs.app_url] : [],
  advanced: {
    database: {
      generateId: () => getUuid(),
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  logger: {
    verboseLogging: false,
    // Disable all logs during build and production
    disabled: true,
  },
  // 添加 cookie 安全配置
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 分钟缓存
    },
  },
  // Cookie 安全属性由 better-auth 自动处理
  // 生产环境会自动设置 Secure, HttpOnly, SameSite=Lax
};

// Helper function to grant free trial credits to new users
async function grantFreeTrialCredits(userId: string) {
  try {
    const { credit } = schema;
    const { and, eq } = await import('drizzle-orm');

    // Check if user has already received free trial credits
    const existingTrial = await db()
      .select()
      .from(credit)
      .where(
        and(eq(credit.userId, userId), eq(credit.transactionScene, 'free_trial'))
      )
      .limit(1);

    if (existingTrial.length > 0) {
      console.log(`User ${userId} already has free trial credits`);
      return; // Already claimed, skip
    }

    // Grant 30 credits, valid for 30 days
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newCredit: NewCredit = {
      id: getUuid(),
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.GRANT,
      transactionScene: 'free_trial',
      userId: userId,
      status: CreditStatus.ACTIVE,
      description: 'Free Trial Credits',
      credits: 30,
      remainingCredits: 30,
      expiresAt: expiresAt,
    };

    await createCredit(newCredit);
    console.log(`Free trial credits automatically granted to user ${userId}`);
  } catch (error) {
    console.error('Failed to grant free trial credits:', error);
    // Don't throw - we don't want to block user registration
  }
}

// Dynamic auth options - WITH database connection
// Only used in API routes that actually need database access
export async function getAuthOptions() {
  const configs = await getAllConfigs();
  return {
    ...authOptions,
    // Add database connection only when actually needed (runtime)
    database: envConfigs.database_url
      ? drizzleAdapter(db(), {
          provider: getDatabaseProvider(envConfigs.database_provider),
          schema: schema,
        })
      : null,
    emailAndPassword: {
      enabled: configs.email_auth_enabled !== 'false',
    },
    socialProviders: await getSocialProviders(configs),
    plugins:
      configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [oneTap()]
        : [],
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        // Monitor user registration events
        if (ctx.path.startsWith('/sign-up')) {
          const newSession = ctx.context.newSession;
          if (newSession && newSession.user) {
            // Automatically grant free trial credits to new users
            await grantFreeTrialCredits(newSession.user.id);
          }
        }
      }),
    },
  };
}

interface SocialProviderConfig {
  clientId: string;
  clientSecret: string;
}

interface SocialProviders {
  google?: SocialProviderConfig;
  github?: SocialProviderConfig;
}

export async function getSocialProviders(
  configs: Record<string, string>
): Promise<SocialProviders> {
  // get configs from db
  const providers: SocialProviders = {};

  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

export function getDatabaseProvider(
  provider: string
): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'sqlite':
      return 'sqlite';
    case 'postgresql':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
